import ComparingSection from "@/components/common/comparingSection";
import HeroSection from "@/components/common/heroSection";
import MainFeatures from "@/components/common/mainFeatures";
import NavBar from "@/components/common/navBar";
import Advertisement from "@/components/common/advertisement";
import AllFeatures from "@/components/common/allFeatures";
import Footer from "@/components/common/footer";


export default function Home() {
  return (
    <div className="">
      <NavBar/>
      <HeroSection/>
      <ComparingSection/>
      <MainFeatures/>
      <Advertisement/>
      <AllFeatures/>
      <Footer/>
    </div>
  );
}
