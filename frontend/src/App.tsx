import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import Chat from "./pages/Chat";
import Analyze from "./pages/Analyze";
import Result from "./pages/Result";
import Models from "./pages/Models";
import History from "./pages/History";
import Landing from "./pages/site/Landing";
import About from "./pages/site/About";
import Services from "./pages/site/Services";
import Products from "./pages/site/Products";
import WhyItMatters from "./pages/site/WhyItMatters";
import Contact from "./pages/site/Contact";
import PrivacyPolicy from "./pages/site/PrivacyPolicy";
import TermsOfService from "./pages/site/TermsOfService";
import NotFound from "./pages/site/NotFound";
import { CHECK_PATH, OPEN_CHAT_EVENT } from "./lib/chat";

/** Landing-page CTAs dispatch an event; this turns it into a route change. */
function ChatOpener() {
  const nav = useNavigate();
  useEffect(() => {
    const open = () => nav(CHECK_PATH);
    window.addEventListener(OPEN_CHAT_EVENT, open);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, open);
  }, [nav]);
  return null;
}

export default function App() {
  return (
    <>
      <ChatOpener />
      <Routes>
        {/* Public site */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/products" element={<Products />} />
        <Route path="/why-it-matters" element={<WhyItMatters />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />

        {/* The app */}
        <Route element={<Layout />}>
          <Route path="/check" element={<Chat />} />
          <Route path="/result/:id" element={<Result />} />
          <Route path="/history" element={<History />} />
          <Route path="/models" element={<Models />} />
          <Route path="/advanced" element={<Analyze />} />
          <Route path="/analyze" element={<Navigate to="/check" replace />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
