import {
  AboutSection,
  AIProjectsSection,
  BlogSection,
  CertificationsSection,
  ContactSection,
  EducationSection,
  ExperienceSection,
  HeroSection,
  ProjectsSection,
  TestimonialsSection,
} from "@/components/sections";

async function PortfolioContent() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <AIProjectsSection />

      <ExperienceSection />

      <CertificationsSection />
      <TestimonialsSection />
      <ProjectsSection />
      <EducationSection />

      {/* <SkillsSection /> */}

      {/* <AchievementsSection /> */}
      {/* <ServicesSection /> */}
      <BlogSection />
      <ContactSection />
    </>
  );
}

export default PortfolioContent;
