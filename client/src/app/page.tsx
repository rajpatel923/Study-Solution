import AboutUs from "@/components/common/aboutUs";
import HeroSection from "@/components/common/heroSection";
import MainFeatures from "@/components/common/mainFeatures";
import NavBar from "@/components/common/navBar";


import Footer from "@/components/common/footer";
import Pricing from "@/components/common/pricing";
import TestimonialsCarousel from "@/components/common/testimonialsCarousel";


export default function Home() {
  return (
    <div>
        <NavBar/>
        <HeroSection/>
        <AboutUs/>
        <MainFeatures/>
        <Pricing/>
        <TestimonialsCarousel/>
        <Footer/> 
    </div>
  );
}
