import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-20 sm:pt-24 lg:pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 xl:py-24">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-12 lg:mb-16 animate-fade-in-up">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-health-text mb-3 sm:mb-4 lg:mb-6 px-2 sm:px-0">
                HiiHealth Mobile App – Privacy Policy
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-4 sm:mb-6 lg:mb-8 px-2 sm:px-0">
                <strong>Last Updated:</strong> November 2025
              </p>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 px-2 sm:px-0">
                <span className="text-primary">Hii</span>
                <span className="text-black">Health</span> Pte. Ltd., Singapore
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none space-y-6 sm:space-y-8 lg:space-y-12">
              {/* Section 1 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    1
                  </span>
                  <span className="leading-tight">Information We Collect</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    <span className="text-primary font-semibold">Hii</span>
                    <span className="text-black font-semibold">Health</span> ("we", "our", or "us") is operated by <span className="text-primary font-semibold">Hii</span>
                    <span className="text-black font-semibold">Health</span> Pte Ltd, a company registered in Singapore. This Privacy Policy explains how we collect, use, and protect your information when you use the <span className="text-primary font-semibold">Hii</span>
                    <span className="text-black font-semibold">Health</span> mobile application (the "App") available on Android and iOS.
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    By using the App, you agree to the collection and use of information in accordance with this Privacy Policy.
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4 font-semibold">
                    We collect only the minimum amount of personal and health-related data required to provide and improve our services.
                  </p>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-health-text mb-3 mt-6">a. User-Provided Information</h3>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span><strong>Age and Gender:</strong> Collected to personalize and calibrate biomarker reference ranges and accuracy.</span>
                    </li>
                  </ul>

                  <h3 className="text-lg sm:text-xl font-bold text-health-text mb-3 mt-6">b. Video Data</h3>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span><strong>Face and Finger Videos:</strong> Collected to extract remote photoplethysmography (rPPG) signals and improve biomarker accuracy.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 sm:mr-3 mt-1 flex-shrink-0 font-bold">
                        ×
                      </span>
                      <span><strong>Penis Videos:</strong> Strictly not collected or stored under any circumstance.</span>
                    </li>
                  </ul>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    Only processed face and finger videos are temporarily stored on secure AWS servers for quality and verification purposes.
                  </p>

                  <h3 className="text-lg sm:text-xl font-bold text-health-text mb-3 mt-6">c. Derived Health Data</h3>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    We process the extracted rPPG signal to calculate non-invasive health indicators such as:
                  </p>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Heart Rate (HR)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Heart Rate Variability (HRV)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Vascular Age and related cardiovascular biomarkers</span>
                    </li>
                  </ul>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    No other personal or device data (e.g., contacts, location, files, or identifiers) are collected.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    2
                  </span>
                  <span className="leading-tight">Purpose of Data Use</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    We use the collected data solely to:
                  </p>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Personalize biomarker reference ranges based on age and gender</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Improve the accuracy and reliability of rPPG signal extraction</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Ensure system integrity and verify doubtful measurements</span>
                    </li>
                  </ul>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed font-semibold">
                    We do not sell, rent, or share user data for advertising or marketing purposes.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    3
                  </span>
                  <span className="leading-tight">
                    Data Processing and Storage
                  </span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>All data is processed and stored securely on Amazon Web Services (AWS) servers located in the <strong>Asia Pacific (Singapore)</strong> region.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Only the processed face and finger videos are stored temporarily for internal verification.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Data is retained for approximately <strong>2–3 minutes</strong> after processing, after which it is automatically deleted.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>No raw or identifiable health data is shared with any third party.</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    4
                  </span>
                  <span className="leading-tight">
                    Third-Party Services
                  </span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    We use a limited set of trusted technologies and SDKs to support our app functionality:
                  </p>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span><strong>MediaPipe</strong> – for computer vision and facial/finger landmark detection</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span><strong>YOLOv11</strong> – for segmentation and region identification</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span><strong>AWS Cloud Storage & AWS Cognito</strong> – for secure data storage and user authentication</span>
                    </li>
                  </ul>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    These services operate under their own privacy policies, and we ensure all integrations comply with international privacy standards.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    5
                  </span>
                  <span className="leading-tight">Data Security</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    We take user privacy and data protection seriously.
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-3 sm:mb-4">
                    All data transmissions and storage follow industry-standard security practices, including:
                  </p>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>End-to-end data encryption (in transit and at rest)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>De-identification of health-related data</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Secure user authentication via AWS Cognito</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Restricted internal access with monitoring and audit controls</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 6 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    6
                  </span>
                  <span className="leading-tight">
                    User Rights and Controls
                  </span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    Users have full control over their data. You may:
                  </p>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Delete your account or data by submitting a request to our support team</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Export your biomarker data upon request</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2 sm:mr-3 mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>Withdraw consent to data processing at any time</span>
                    </li>
                  </ul>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    To exercise these rights, contact us at{" "}
                    <a
                      href="mailto:yu@hehealth.ai"
                      className="text-primary hover:underline font-semibold min-h-[44px] touch-manipulation inline-block py-1"
                    >
                      yu@hehealth.ai
                    </a>
                    .
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    7
                  </span>
                  <span className="leading-tight">
                    Eligibility
                  </span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    The <span className="text-primary font-semibold">Hii</span>
                    <span className="text-black font-semibold">Health</span> App is intended only for users aged <strong>18 years and above</strong>. We do not knowingly collect or process data from minors.
                  </p>
                </div>
              </section>

              {/* Section 8 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    8
                  </span>
                  <span className="leading-tight">Changes to This Policy</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4">
                    We may update this Privacy Policy periodically to reflect changes in our practices or for legal and regulatory reasons. Updated versions will be posted on our official website and within the app with a revised "Last Updated" date.
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section className="animate-fade-in-up">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-health-text mb-4 sm:mb-6 flex flex-row items-center gap-2 sm:gap-4">
                  <span className="bg-primary text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                    9
                  </span>
                  <span className="leading-tight">Contact Us</span>
                </h2>
                <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed mb-4">
                    If you have any questions or concerns about this Privacy Policy or data handling practices, please contact us at:
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
                      <span><span className="text-primary font-semibold">Hii</span><span className="text-black font-semibold">Health</span> Pte Ltd, Singapore</span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center py-6 sm:py-8 lg:py-12 border-t border-gray-200 mt-8 sm:mt-12">
                <p className="text-base sm:text-lg md:text-xl text-gray-600 font-semibold">
                  © 2025 <span className="text-primary">Hii</span><span className="text-black">Health</span> Pte Ltd. All rights reserved.
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

export default PrivacyPolicy;
