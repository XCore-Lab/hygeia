import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-20 sm:pt-24 lg:pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 xl:py-24">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-12 lg:mb-16 animate-fade-in-up">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-health-text mb-3 sm:mb-4 lg:mb-6 px-2 sm:px-0">
                HiiHealth Mobile App – Terms and Conditions
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-4 sm:mb-6 lg:mb-8 px-2 sm:px-0">
                <strong>Last Updated:</strong> November 2025
              </p>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 px-2 sm:px-0">
                <span className="text-primary">Hii</span>
                <span className="text-black">Health</span> Pte Ltd, Singapore
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none space-y-6 sm:space-y-8 lg:space-y-12">
              {/* Introduction */}
              <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100 animate-fade-in-up">
                <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                  Welcome to <span className="text-primary font-semibold">Hii</span>
                  <span className="text-black font-semibold">Health</span>, a mobile application operated by HiiHealth Pte Ltd, registered in Singapore ("we", "our", or "us"). These Terms and Conditions ("Terms") govern your use of the <span className="text-primary font-semibold">Hii</span>
                  <span className="text-black font-semibold">Health</span> mobile application (the "App") available on Android and iOS platforms.
                </p>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                  By accessing or using the App, you agree to be bound by these Terms.
                </p>
              </div>

              {/* Section 1 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    1
                  </span>
                  <span className="leading-tight">Purpose of the App</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    The <span className="text-primary font-semibold">Hii</span>
                    <span className="text-black font-semibold">Health</span> App provides users with non-invasive health and wellness insights using remote photoplethysmography (rPPG) technology through facial and finger video recordings. The App calculates wellness-related biomarkers such as Heart Rate (HR), Heart Rate Variability (HRV), and Vascular Age.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm sm:text-base lg:text-lg text-amber-800 leading-relaxed font-semibold">
                      These results are for informational and wellness purposes only and are not intended for medical diagnosis, treatment, or as a substitute for professional medical advice.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    2
                  </span>
                  <span className="leading-tight">Eligibility</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    The App is intended for individuals aged <strong>18 years and above</strong>. By using the App, you confirm that you meet this age requirement.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    3
                  </span>
                  <span className="leading-tight">User Responsibilities</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    You agree to:
                  </p>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Provide accurate and truthful information, including your age and gender.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Use the App only for lawful and intended purposes.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Refrain from using the App for emergency medical conditions or diagnostic purposes.</span>
                    </li>
                  </ul>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    You understand that all outputs and insights provided by <span className="text-primary font-semibold">Hii</span>
                    <span className="text-black font-semibold">Health</span> are for general wellness and educational use only and should not replace consultation with a qualified healthcare professional.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    4
                  </span>
                  <span className="leading-tight">Account Registration and Access</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    Users are required to create an account to access the App's features. Account authentication is managed securely via AWS Cognito.
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    You may request account deletion or data removal by contacting{" "}
                    <a
                      href="mailto:yu@hehealth.ai"
                      className="text-primary hover:underline font-semibold min-h-[44px] touch-manipulation inline-block py-1"
                    >
                      yu@hehealth.ai
                    </a>
                    . We reserve the right to suspend or terminate accounts that violate these Terms or misuse the App's functionalities.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    5
                  </span>
                  <span className="leading-tight">Data and Privacy</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    Your privacy is important to us. Our practices related to data collection, storage, and use are detailed in our Privacy Policy, which is incorporated into these Terms by reference. By using the App, you agree to the terms outlined in the Privacy Policy.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    6
                  </span>
                  <span className="leading-tight">Intellectual Property</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    All content, algorithms, models, designs, and trademarks associated with the <span className="text-primary font-semibold">Hii</span>
                    <span className="text-black font-semibold">Health</span> App are the exclusive property of HiiHealth Pte Ltd. Unauthorized copying, distribution, modification, or commercial use of any part of the App is strictly prohibited.
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    The App integrates open-source technologies such as MediaPipe and YOLOv11, which are used under their respective open-source licenses.
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    7
                  </span>
                  <span className="leading-tight">Medical Disclaimer</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    The App's biomarker outputs (including HR, HRV, and Vascular Age) are intended for wellness monitoring only. <span className="text-primary font-semibold">Hii</span>
                    <span className="text-black font-semibold">Health</span> does not provide medical or clinical advice, and the information should not be relied upon for diagnosing or treating any medical condition.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm sm:text-base lg:text-lg text-red-800 leading-relaxed font-semibold">
                      Always seek the advice of a qualified healthcare provider regarding any medical concerns.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 8 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    8
                  </span>
                  <span className="leading-tight">Limitation of Liability</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    To the maximum extent permitted by law, HiiHealth Pte Ltd shall not be held liable for:
                  </p>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Any inaccuracies or interpretation errors in biomarker data;</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Any damages arising from the use or inability to use the App;</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Any third-party service interruptions or software defects.</span>
                    </li>
                  </ul>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed font-semibold">
                    Your use of the App is at your own discretion and risk.
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    9
                  </span>
                  <span className="leading-tight">Termination</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    We may suspend or terminate your access to the App without prior notice if we reasonably believe you have violated these Terms or engaged in misuse.
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    You may also discontinue use of the App and request deletion of your data at any time.
                  </p>
                </div>
              </section>

              {/* Section 10 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    10
                  </span>
                  <span className="leading-tight">Modifications to the Terms</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    We may update or modify these Terms periodically. Any updates will be reflected in the App and on our website with a revised "Last Updated" date.
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    Continued use of the App after changes are posted constitutes your acceptance of the updated Terms.
                  </p>
                </div>
              </section>

              {/* Section 11 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    11
                  </span>
                  <span className="leading-tight">Governing Law</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    These Terms shall be governed by and construed in accordance with the laws of Singapore.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    12
                  </span>
                  <span className="leading-tight">Contact Us</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4">
                    If you have any questions or concerns about these Terms, please contact us at:
                  </p>
                  <div className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600">
                    <p className="flex items-start">
                      <span className="font-semibold mr-2">📧</span>
                      <a
                        href="mailto:yu@hehealth.ai"
                        className="text-primary hover:underline font-semibold min-h-[44px] touch-manipulation inline-block py-1"
                      >
                        yu@hehealth.ai
                      </a>
                    </p>
                    <p className="flex items-start">
                      <span className="font-semibold mr-2">🏢</span>
                      <span>HiiHealth Pte Ltd, Singapore</span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center py-6 sm:py-8 lg:py-12 border-t border-gray-200 mt-8 sm:mt-12">
                <p className="text-base sm:text-lg md:text-xl text-gray-600 font-semibold">
                  © 2025 HiiHealth Pte Ltd. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default TermsOfService;
