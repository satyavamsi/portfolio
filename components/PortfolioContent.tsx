import {
  AboutSection,
  AchievementsSection,
  BlogSection,
  CertificationsSection,
  ContactSection,
  EducationSection,
  ExperienceSection,
  HeroSection,
  ProjectsSection,
  ServicesSection,
  SkillsSection,
  TestimonialsSection,
} from "@/components/sections";

async function PortfolioContent() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ExperienceSection />
      <EducationSection />
      <CertificationsSection />
      <TestimonialsSection />
      <ProjectsSection />
      {/* <SkillsSection /> */}

      {/* <AchievementsSection /> */}
      {/* <ServicesSection /> */}
      <BlogSection />
      <ContactSection />
    </>
  );
}

export default PortfolioContent;
