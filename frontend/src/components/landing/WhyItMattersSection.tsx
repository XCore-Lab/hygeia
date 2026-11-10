const WhyItMattersSection = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-24 mint-section">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          {/* Content */}
          <div className="space-y-4 sm:space-y-6 animate-fade-in-left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-health-text animate-fade-in-up px-2 sm:px-0">
              Why It Matters
            </h2>

            <div className="space-y-4 sm:space-y-6">
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed sm:leading-relaxed md:leading-relaxed font-light animate-fade-in-up animate-stagger-1 px-2 sm:px-0">
                Infectious diseases will always pose a threat, and vulnerable
                populations will always be most at risk. We must create global
                prevention tools that ensure everyone has access to the right
                tools and care.
              </p>

              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed sm:leading-relaxed md:leading-relaxed font-light animate-fade-in-up animate-stagger-2 px-2 sm:px-0">
                By using AI for early disease detection responsibly and
                empowering anyone with life-changing insights, we provide a
                smarter, faster approach to protecting global health.
              </p>
            </div>
          </div>

          {/* Video */}
          <div className="relative animate-fade-in-right">
            <div className="rounded-xl lg:rounded-2xl overflow-hidden shadow-lg hover-lift animate-bounce-gentle bg-white p-2 sm:p-3">
              <div className="rounded-lg lg:rounded-xl overflow-hidden">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  className="w-full h-[280px] sm:h-[320px] md:h-[400px] lg:h-[450px] xl:h-[500px] object-contain bg-gradient-to-br from-green-50 to-emerald-50"
                >
                  <source src="/ai_researcher.mp4" type="video/mp4" />
                  {/* Fallback for browsers that don't support video */}
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <span className="text-white text-lg sm:text-xl lg:text-2xl font-bold text-center px-4">
                      AI Research
                    </span>
                  </div>
                </video>
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 sm:w-32 sm:h-32 bg-primary/10 rounded-full blur-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyItMattersSection;
