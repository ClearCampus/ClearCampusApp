import { motion } from "motion/react";
import NoiseBackground from "../components/Background";
import Navbar from "../components/Navbar";
import { ScreenWindowOverlay } from "../components/ScreenWindowOverlay";
import type { ReactNode } from "react";
import { useMediaQuery } from "../lib/useMediaQuery";

interface PageWrapperProps {
    children: ReactNode,
    page?: "home" | "students" | "clubs" | "events",
}

export default function (props: PageWrapperProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");

  return (
    <main className="w-full h-screen flex flex-col items-center justify-start">
      <Navbar page={props.page} />
      <ScreenWindowOverlay padding={24} topInset={isMobile ? 82 : 70} borderRadius={16} />
      <NoiseBackground />

      <div className="flex w-[95%] grow mb-8 px-7 pt-28 pb-12 sm:px-8 sm:pt-28 sm:pb-12 md:px-12 md:pt-32 md:pb-14 lg:p-32 flex-col gap-6 sm:gap-8 justify-start items-center overflow-x-clip">
        {props.children}
      </div>

      <motion.div
        className="w-full h-full fixed bg-background z-500"
        initial={{
          opacity: 1,
        }}
        animate={{
          opacity: 0,
          display: "none",
        }}
        transition={{
          type: "tween",
          duration: 0.3,
          delay: 0.5,
          ease: "easeOut",
        }}
      />
    </main>
  );
}
