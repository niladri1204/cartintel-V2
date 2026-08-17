import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import DemoPreview from "../components/DemoPreview";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <DemoPreview />
      <Features />
      <HowItWorks />
      <Footer />
    </>
  );
}