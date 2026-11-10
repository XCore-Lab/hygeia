"""Risk-assessment engine: combines the unified vision payload with the questionnaire.

This is the "orchestrator" consumption logic described in technical doc section 33:
branch on relevance first, then handle all four combinations of `escalate` and
`review_required`, then fold in symptom and exposure signals. Every decision is
returned with its reasons so the UI can show *why* a level was assigned.

Two things the classifier cannot know are handled here explicitly:

* **Scope.** The classifier knows six categories. Genital skin shows many other
  things (normal variants, dermatitis, folliculitis, molluscum, trauma...). When the
  second reader says the appearance is outside the six, or the classifier is unsure
  and the second reader disagrees, the result is flagged `scope.outside_trained_categories`
  and a plain-language differential of look-alikes is attached.
* **Exposure.** "No recent sexual contact" lowers the prior for an STI but never
  excludes one (skin-to-skin transmission, long incubation), and several look-alikes
  are not sexually transmitted at all. That reasoning is spelled out in `notes`
  instead of silently lowering the level (zero-miss policy).
"""
from __future__ import annotations

from . import config

LEVELS = ["low", "moderate", "high", "urgent"]

# Category severity priors (ordinal). These are triage-routing weights, not diagnoses.
CATEGORY_SEVERITY = {
    "Normal": 0, "Penile_candidiasis": 1, "Genital_warts": 2, "HSV": 2, "Syphillis": 3, "Penile_cancer": 4,
}

# Red-flag wording from the second reader that justifies raising (not just holding) the level.
SEVERE_FLAG_TERMS = ["bleed", "ulcer", "necro", "indurat", "mass", "rapid", "spreading", "pigment", "black",
                     "non-healing", "nonhealing", "pus", "purulent", "fever", "systemic", "lymph", "severe pain"]

SYMPTOM_LABELS = {
    "bumps": "bumps or growths", "ulcer_sore": "an ulcer or open sore", "blister": "blisters",
    "rash": "a rash or redness", "itching": "itching", "discharge": "discharge",
    "pain_urination": "pain when urinating", "bleeding": "bleeding", "swelling": "swelling",
    "fever": "fever or feeling unwell", "none": "no symptoms",
}

# Look-alikes outside the six trained categories. Plain language, for the differential shown to the
# person and the clinician. Keyed by the leading category and by reported symptoms.
CATEGORY_LOOKALIKES = {
    "Genital_warts": ["pearly penile papules or Fordyce spots (normal anatomy)",
                      "molluscum contagiosum (spreads by skin contact, not only sex)", "skin tags or small cysts"],
    "HSV": ["friction sores or aphthous-type ulcers", "folliculitis (infected hair follicles)",
            "contact dermatitis (soaps, condoms, lubricants)"],
    "Syphillis": ["a traumatic or friction ulcer", "fixed drug eruption", "Behçet's disease (rare)"],
    "Penile_candidiasis": ["irritant balanitis or contact dermatitis", "psoriasis or lichen planus",
                           "a fungal infection of the skin (tinea)"],
    "Penile_cancer": ["lichen sclerosus (a non-cancer skin condition)", "a persistent wart or long-standing balanitis"],
    "Normal": [],
}
SYMPTOM_LOOKALIKES = {
    "bumps": ["pearly penile papules or Fordyce spots (normal anatomy)", "folliculitis or ingrown hairs",
              "molluscum contagiosum (spreads by skin contact, not only sex)"],
    "ulcer_sore": ["a traumatic or friction sore", "aphthous-type ulcer"],
    "blister": ["a friction blister or minor burn", "bullous impetigo (a bacterial skin infection)"],
    "rash": ["irritant or contact dermatitis (soaps, condoms, washing powder)",
             "balanitis (inflammation that is often not sexually transmitted)", "a fungal infection or psoriasis"],
    "itching": ["contact dermatitis", "thrush (candida), which is not usually sexually transmitted",
                "scabies or pubic lice (close body contact)"],
    "swelling": ["an insect bite or allergic reaction", "a blocked gland or cyst", "a minor injury"],
}
TRANSMISSION = {
    "Genital_warts": "Genital warts (HPV) spread by skin-to-skin contact, which includes but is not limited to sex, "
                     "and can first appear months after contact.",
    "HSV": "Herpes (HSV) spreads by skin-to-skin contact with an affected area, including oral contact, and a first "
           "outbreak can appear long after exposure.",
    "Syphillis": "Syphilis is passed through sexual contact, including oral sex; the first sore usually appears "
                 "three weeks to three months afterwards and is painless.",
    "Penile_candidiasis": "Thrush (candida) is not usually sexually transmitted; it is a yeast overgrowth linked to "
                          "moisture, antibiotics, diabetes or skin irritation.",
    "Penile_cancer": "This pattern is not something that can be caught from anyone; it is a change in the skin's own "
                     "cells, and it is very treatable when found early.",
}


def _bump(level: int, n: int = 1) -> int:
    return min(len(LEVELS) - 1, level + n)


def _dedupe(items: list[str], limit: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        k = (x or "").strip().lower().rstrip(".")
        if k and k not in seen:
            seen.add(k)
            out.append(x.strip())
        if len(out) >= limit:
            break
    return out


def assess(relevance: dict, likelihood: dict | None, abnormalities: dict | None,
           vlm: dict | None, questionnaire: dict | None) -> dict:
    q = questionnaire or {}
    symptoms = set(q.get("symptoms") or [])
    exposure = q.get("exposure")
    reasons: list[str] = []
    actions: list[str] = []
    testing: list[str] = []
    notes: list[str] = []
    scope = {"outside_trained_categories": False, "best_match": None, "differential": []}

    # ------------------------------------------------------------------ State A
    if not relevance.get("is_relevant", False):
        level = 1 if (symptoms - {"none"}) else 0
        return {
            "status": "not_analysable",
            "risk_level": LEVELS[level], "urgency_score": 25 if level else 10,
            "headline": "We couldn't analyse this photo",
            "summary": "The image did not pass the relevance check, so no visual analysis was performed. "
                       "This is not a result and does not mean nothing was found.",
            "reasons": ["Relevance gate rejected the image (not recognised as analysable skin content)."],
            "actions": ["Retake the photo: fill the frame with the area of concern, use good natural light, "
                        "keep the camera steady and avoid filters.",
                        "If symptoms are present, a clinic can assess you regardless of the photo."],
            "testing": [], "notes": [], "scope": scope,
            "flags": {"escalate": False, "review_required": False, "not_analysable": True},
        }

    # ------------------------------------------------------------------ State B
    cat = likelihood["category"]
    conf = likelihood["confidence"]
    abn = likelihood["abnormality_score"]
    escalate = bool(likelihood["escalate"])
    review = bool(likelihood["review_required"])
    sev = CATEGORY_SEVERITY.get(cat, 2)

    if escalate:
        level = 1
        reasons.append(f"Abnormality score {abn:.0%} is at or above the escalation threshold "
                       f"({config.ESCALATION_THRESHOLD:.0%}, zero-miss operating point).")
        if sev >= 3:
            level = _bump(level, 2 if sev == 4 else 1)
            reasons.append(f"Leading visual pattern resembles {likelihood['category_display']} "
                           f"({conf:.0%}), a category that warrants prompt clinical assessment.")
        elif sev >= 1:
            reasons.append(f"Leading visual pattern resembles {likelihood['category_display']} ({conf:.0%}).")
        if not review and conf >= 0.85 and likelihood.get("members_agree", True):
            reasons.append("High-confidence pattern with agreement between ensemble members.")
    else:
        level = 0
        reasons.append(f"Visual pattern is consistent with normal-appearing skin "
                       f"(abnormality score {abn:.0%}).")

    if review:
        level = max(level, 1)
        reasons.append(f"Classifier confidence {conf:.0%} is below the {config.CONFIDENCE_THRESHOLD:.0%} "
                       f"confidence gate, so this result is routed for human review rather than auto-processed.")
        if not escalate:
            reasons.append("A low-confidence 'normal' result must not be treated as reassurance (doc §33.2).")

    members_disagree = likelihood.get("members_agree") is False
    if members_disagree:
        reasons.append("Ensemble members disagreed on the leading category; category is uncertain.")

    # Segmentation evidence (skipped when the second reader judged the outlines unreliable)
    if abnormalities and abnormalities.get("available") and abnormalities.get("localisation_reliable") is False:
        reasons.append("The second reader judged the outlined regions to be in the wrong place, so the markup is hidden "
                       "and localisation did not influence this level.")
    elif abnormalities and abnormalities.get("available"):
        corr = abnormalities.get("correction") or {}
        if abnormalities.get("heatmap") and not abnormalities.get("instance_count"):
            reasons.append("No reliable outline could be drawn, so the second reader's own view of where the changes are "
                           "is shown as a soft heat map instead; it is an orientation aid, not a measurement.")
        if corr.get("added"):
            reasons.append(f"The second reader added {corr['added']} region(s) it could see that the segmenter had missed"
                           + ("; it replaced outlines it judged wrong." if corr.get("replaced") else "."))
        s = abnormalities["summary"]
        n = abnormalities["instance_count"]
        if n:
            reasons.append(f"Segmentation found {n} localised abnormality instance(s) "
                           f"({s['burden']}, {s['spatial_pattern']}, {s['total_area_ratio']:.1%} of the image).")
            if s.get("multi_source"):
                reasons.append(f"{s['multi_source']} of them were proposed independently by two or more sources "
                               "(vision-language grounding, open-vocabulary detector, classifier attention).")
            rv = abnormalities.get("review") or {}
            if rv.get("removed"):
                reasons.append(f"The second reader rejected {len(rv['removed'])} single-source proposal(s) as normal "
                               "anatomy or artefact; they were removed from the count.")
            if rv.get("disputed"):
                reasons.append(f"{rv['disputed']} instance(s) are disputed: the second reader did not see an abnormality "
                               "but several sources agreed, so they are kept for a human reviewer.")
            if escalate and (s["total_area_ratio"] > 0.15 or n >= 8):
                level = _bump(level)
                reasons.append("Extensive or numerous localised findings increase the priority.")
            strong = [i for i in abnormalities["instances"] if i["confidence"] >= 0.50]
            if not escalate and len(strong) >= 2 and s["total_area_ratio"] > 0.03:
                level = max(level, 1)
                reasons.append("Several confident localised findings were detected although the classifier read the "
                               "image as normal; treated as needing review.")
            elif not escalate:
                reasons.append("Localised proposals on a normal-reading image are low-confidence and do not change the level.")

    # VLM second-reader consistency, scope and red flags
    cons = None
    differential: list[str] = []
    if vlm and vlm.get("available") and vlm.get("refused"):
        reasons.append("The vision-language second reader declined to describe this photo; the level rests on the measured "
                       "classifier, the localisation and your answers.")
    if vlm and vlm.get("available") and vlm.get("parsed"):
        cons = vlm.get("consistency")
        if cons == "inconsistent":
            level = max(level, 1)
            reasons.append("The vision-language second reader disagreed with the classifier; "
                           "the category should be treated as uncertain.")
        best = (vlm.get("best_match") or "").strip() or None
        scope["best_match"] = best
        if vlm.get("outside_trained_categories") is True:
            scope["outside_trained_categories"] = True
        differential += vlm.get("alternative_considerations") or []
        if vlm.get("red_flags"):
            # Generated text can over-report; red flags hold the level at "moderate" or above but never
            # raise it on their own. Severe wording is surfaced for the reviewer.
            text = " ".join(vlm["red_flags"]).lower()
            severe = [k for k in SEVERE_FLAG_TERMS if k in text]
            level = max(level, 1)
            reasons.append("Second reader noted visual red flags" + (f" (severe wording: {', '.join(severe[:3])})" if severe else "")
                           + ": " + "; ".join(vlm["red_flags"][:3]) + ". Advisory only.")
        if vlm.get("image_quality") == "poor":
            reasons.append("Second reader rated image quality as poor; results are less reliable.")

    # Scope: the classifier only knows six categories.
    if review and (cons == "inconsistent" or members_disagree):
        scope["outside_trained_categories"] = True
    if scope["outside_trained_categories"]:
        level = max(level, 1)
        best = scope["best_match"]
        reasons.append("What is visible may be something outside the six categories Hygeia was trained on"
                       + (f"; the second reader's closest match was '{best}'" if best else "")
                       + ". A clinician can identify it in person, and many such conditions are harmless or not "
                         "sexually transmitted.")
    if escalate:
        differential += CATEGORY_LOOKALIKES.get(cat, [])
    for s_id in ("bumps", "ulcer_sore", "blister", "rash", "itching", "swelling"):
        if s_id in symptoms:
            differential += SYMPTOM_LOOKALIKES[s_id][:2]
    scope["differential"] = _dedupe(differential, 5)

    # Questionnaire modifiers
    if ({"ulcer_sore", "blister"} & symptoms) and exposure == "unprotected":
        level = _bump(level)
        reasons.append("An ulcer, sore or blisters after unprotected exposure need clinical assessment and testing.")
        testing.append("syphilis serology and HSV swab")
    if "fever" in symptoms and ({"rash", "ulcer_sore", "blister", "swelling"} & symptoms):
        level = _bump(level)
        reasons.append("Systemic symptoms (fever) together with skin changes raise the priority.")
    if "bleeding" in symptoms or (q.get("duration") == ">4w" and ({"ulcer_sore", "bumps", "swelling"} & symptoms)):
        level = _bump(level)
        reasons.append("Bleeding or a lesion persisting beyond four weeks should be examined in person.")
    if {"discharge", "pain_urination"} & symptoms:
        level = max(level, 1)
        reasons.append("Discharge or pain on urination cannot be assessed from a photo and warrants testing.")
        testing.append("chlamydia and gonorrhoea NAAT (urine or swab)")
    if q.get("partner_sti"):
        level = max(level, 1)
        reasons.append("A partner diagnosed with an STI makes testing advisable regardless of the image.")
        testing.append("full STI screen")
    if exposure == "unprotected" and level == 0:
        reasons.append("Recent unprotected exposure: routine screening is recommended even with a normal-looking image.")
        testing.append("routine STI screen (HIV, syphilis, chlamydia, gonorrhoea)")
    if cat == "Penile_cancer" and escalate:
        testing.append("in-person examination; biopsy is a clinician's decision")
    if cat in ("HSV", "Syphillis") and escalate:
        testing.append("syphilis serology and HSV PCR swab")
    if cat == "Genital_warts" and escalate:
        testing.append("clinical examination; HPV-related assessment")
    if cat == "Penile_candidiasis" and escalate:
        testing.append("clinical examination; swab if persistent")

    # Exposure reasoning: spelled out, never used to lower the level.
    if exposure == "none":
        reasons.append("No recent sexual contact was reported. This lowers the likelihood of a sexually transmitted "
                       "cause but does not exclude one, so the visual findings still set the level.")
        notes.append("You said you have had no recent sexual contact. That makes an STI less likely, but not impossible: "
                     "herpes, warts and molluscum pass by skin-to-skin contact, and first symptoms can appear months "
                     "after a past contact. Several look-alikes, such as thrush, balanitis, dermatitis and folliculitis, "
                     "are not sexually transmitted at all. A clinic can tell these apart quickly.")
        if escalate and cat == "Syphillis":
            notes.append("A syphilis-like pattern with no sexual contact at all would be unusual, which is one more "
                         "reason to have it looked at: a simple blood test settles it either way.")
        if level >= 1 and not testing:
            testing.append("clinical examination; a swab or skin assessment depending on what the clinician sees")
    elif exposure == "unknown":
        notes.append("You preferred not to say about recent sexual contact, which is fine. The clinic will only ask "
                     "so they can choose the right tests.")
    if escalate and cat in TRANSMISSION:
        notes.append(TRANSMISSION[cat])
    if scope["outside_trained_categories"]:
        notes.append("Hygeia was trained to recognise six specific patterns. What you have may be something else "
                     "entirely, and most other genital skin conditions are common, harmless or easily treated.")

    testing = list(dict.fromkeys(testing))
    lvl = LEVELS[level]
    urgency = {0: 12, 1: 40, 2: 68, 3: 90}[level]
    if review and level <= 1:
        urgency += 8

    headline = {
        "low": "No concerning visual pattern found",
        "moderate": "Worth getting checked",
        "high": "Please arrange a clinic visit soon",
        "urgent": "Please see a clinician promptly",
    }[lvl]
    if scope["outside_trained_categories"] and lvl == "moderate":
        headline = "Worth getting checked, possibly not an STI"
    summary = {
        "low": "The visual analysis did not flag an abnormal pattern. If you have symptoms or a recent exposure, "
               "confidential testing is still the only way to be sure.",
        "moderate": "Something in the photo or your answers suggests it is worth a confidential check at a clinic. "
                    "Most conditions in this group are common and treatable.",
        "high": "The visual pattern and/or your answers indicate you should be seen by a healthcare professional soon. "
                "A clinic can confirm what this is and start treatment.",
        "urgent": "The findings warrant prompt in-person assessment. Please contact a sexual-health or primary-care "
                  "clinic as soon as you can. Early assessment leads to the best outcomes.",
    }[lvl]
    if exposure == "none" and level >= 1:
        summary += " With no recent sexual contact, a non-STI skin condition is a real possibility, and a clinician can tell the difference quickly."
    actions = {
        "low": ["Keep an eye on the area and re-check if anything changes.",
                "Consider routine screening if you have had a new or unprotected partner."],
        "moderate": ["Book a confidential sexual-health or skin check within the next one to two weeks.",
                     "Avoid sexual contact until you have been assessed, or use condoms consistently.",
                     "Do not apply creams or home remedies before being examined."],
        "high": ["Book a sexual-health or GP appointment within the next few days.",
                 "Avoid sexual contact until assessed.",
                 "Bring this report; it summarises what was seen and when it started."],
        "urgent": ["Contact a clinic today or as soon as possible; mention a persistent or changing genital lesion.",
                   "Avoid sexual contact until assessed.",
                   "If you have severe pain, fever, or rapid spreading, seek same-day care."],
    }[lvl]
    if exposure == "none" and level >= 1:
        actions.append("Tell the clinician you have had no recent sexual contact; it changes which tests are useful.")
    if review:
        actions.append("This case has been marked for human review because the model was not confident.")

    return {
        "status": "analysed",
        "risk_level": lvl, "urgency_score": min(urgency, 100),
        "headline": headline, "summary": summary,
        "reasons": reasons, "actions": actions, "testing": testing,
        "notes": notes, "scope": scope,
        "flags": {"escalate": escalate, "review_required": review, "not_analysable": False},
        "decision_combination": {
            (False, False): "confidently_normal", (True, False): "confidently_abnormal",
            (True, True): "abnormal_category_uncertain", (False, True): "normal_low_confidence",
        }[(escalate, review)],
    }


def assess_symptoms(questionnaire: dict | None) -> dict:
    """Questionnaire-only triage for the "nothing visible" path.

    Many infections (HIV, chlamydia, gonorrhoea, early syphilis) show nothing on the skin, so a
    photo cannot help; the right next step is a test. This path never claims a visual finding.
    """
    q = questionnaire or {}
    symptoms = set(q.get("symptoms") or []) - {"none"}
    exposure = q.get("exposure")
    pain = bool(q.get("pain")) or "pain" in symptoms
    reasons: list[str] = ["No visible skin change was reported, so no photo was analysed; this assessment is based on "
                          "your answers alone."]
    actions: list[str] = []
    testing: list[str] = []
    notes: list[str] = []
    differential: list[str] = []
    level = 0

    if symptoms or pain:
        level = 1
        felt = [SYMPTOM_LABELS.get(x, x.replace("_", " ")) for x in sorted(symptoms - {"pain"})]
        if pain:
            felt.append("pain or burning")
        reasons.append("Symptoms without a visible change still need assessment: " + ", ".join(felt) + ".")
        if {"discharge", "pain_urination"} & symptoms:
            reasons.append("Discharge or pain on urination are the classic signs of chlamydia, gonorrhoea or a urinary "
                           "infection, all diagnosed by a simple urine or swab test.")
            testing.append("chlamydia and gonorrhoea NAAT (urine or swab)")
            differential += ["a urinary tract infection", "thrush (candida), which is not usually sexually transmitted", "irritation from soaps, condoms or lubricants"]
        if "itching" in symptoms:
            differential += ["thrush (candida), which is not usually sexually transmitted", "contact dermatitis",
                             "scabies or pubic lice (close body contact)"]
        if pain:
            reasons.append("Pain or burning without a visible change can come from inflammation, infection or injury "
                           "and is worth examining.")
            differential += ["a urinary infection or prostatitis", "a strain or minor injury"]
        if "swelling" in symptoms:
            reasons.append("Swelling, for example of a gland or the scrotum, should be examined in person.")
            differential += ["epididymitis (inflammation that needs treatment)", "a cyst or a hernia"]
        if "fever" in symptoms:
            level = _bump(level)
            reasons.append("Fever or feeling unwell alongside genital symptoms raises the priority.")
        if "bleeding" in symptoms:
            level = _bump(level)
            reasons.append("Bleeding should be examined in person.")
        if q.get("duration") == ">4w":
            reasons.append("Symptoms lasting more than four weeks should be looked at rather than waited out.")
    else:
        if exposure == "unprotected":
            level = 1
            reasons.append("Unprotected sexual contact without symptoms: most STIs, including HIV, chlamydia and "
                           "gonorrhoea, cause no visible signs, so only a test can rule them out.")
        elif exposure == "protected":
            reasons.append("Protected sexual contact and no symptoms: the risk is low, and a routine test after a new "
                           "partner is still a sensible habit.")
        else:
            reasons.append("No symptoms and no recent sexual contact were reported.")

    if q.get("partner_sti"):
        level = max(level, 1)
        reasons.append("A partner diagnosed with an STI makes testing advisable even without symptoms.")
        testing.append("full STI screen")
    if q.get("prior_sti"):
        reasons.append("A previous STI makes a routine check more worthwhile.")

    if exposure == "unprotected":
        level = max(level, 1)
        testing.append("routine STI screen (HIV, syphilis, chlamydia, gonorrhoea)")
        notes.append("Tests have window periods: chlamydia and gonorrhoea from about 2 weeks after contact, HIV about "
                     "45 days for a 4th-generation test (3 months to be certain), syphilis 6 to 12 weeks. A clinic will "
                     "tell you when to test and whether to re-test.")
        actions.append("If the contact was within the last 72 hours, contact a clinic or emergency department today "
                       "and ask about PEP (HIV post-exposure prophylaxis); it works best the sooner it is started.")
    elif exposure == "protected":
        notes.append("Condoms greatly reduce the risk of most STIs but do not cover everything: herpes, warts and "
                     "syphilis can pass through skin contact outside the condom. A routine test after a new partner is "
                     "still sensible.")
    elif exposure == "none":
        notes.append("With no recent sexual contact an STI is unlikely, although some infections show up months after a "
                     "past contact. Thrush, urinary infections, dermatitis and simple irritation are the usual "
                     "explanations for symptoms like these, and all are easy to treat.")
    notes.append("Because nothing is visible, a photo would not add anything here. A test is the right next step, and "
                 "it is quick: usually a urine sample, a swab or a small blood draw.")

    testing = list(dict.fromkeys(testing))
    lvl = LEVELS[level]
    urgency = {0: 12, 1: 40, 2: 68, 3: 90}[level]
    headline = {
        "low": "Nothing here needs urgent attention",
        "moderate": "Worth getting tested",
        "high": "Please arrange a clinic visit soon",
        "urgent": "Please see a clinician promptly",
    }[lvl]
    summary = {
        "low": "Based on your answers there is no red flag. If anything changes, or you would like peace of mind after a "
               "new partner, a routine confidential test is quick and free in many places.",
        "moderate": "Your answers suggest a confidential test is worthwhile. Most of what causes these symptoms is common "
                    "and treatable, and the test itself takes minutes.",
        "high": "Your answers indicate you should be seen by a healthcare professional soon. A clinic can confirm what "
                "this is and start treatment.",
        "urgent": "Your answers warrant prompt in-person assessment. Please contact a sexual-health or primary-care "
                  "clinic as soon as you can.",
    }[lvl]
    base_actions = {
        "low": ["Keep an eye on things and come back if anything changes.",
                "Consider a routine screen if you have had a new or unprotected partner."],
        "moderate": ["Book a confidential sexual-health check within the next one to two weeks.",
                     "Avoid sexual contact until you have been tested, or use condoms consistently.",
                     "A urine sample and a swab or blood test are usually all that is needed."],
        "high": ["Book a sexual-health or GP appointment within the next few days.",
                 "Avoid sexual contact until assessed.",
                 "Mention every symptom and when it started; this report lists them."],
        "urgent": ["Contact a clinic today or as soon as possible.",
                   "Avoid sexual contact until assessed.",
                   "If you have severe pain, fever or heavy bleeding, seek same-day care."],
    }[lvl]
    actions = base_actions + actions

    return {
        "status": "symptoms_only",
        "risk_level": lvl, "urgency_score": min(urgency, 100),
        "headline": headline, "summary": summary,
        "reasons": reasons, "actions": actions, "testing": testing,
        "notes": notes,
        "scope": {"outside_trained_categories": False, "best_match": None, "differential": _dedupe(differential, 5)},
        "flags": {"escalate": False, "review_required": False, "not_analysable": False},
        "decision_combination": "symptoms_only",
    }
