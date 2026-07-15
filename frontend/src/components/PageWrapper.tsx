import { motion } from "motion/react";
import NoiseBackground from "../components/Background";
import Navbar from "../components/Navbar";
import { ScreenWindowOverlay } from "../components/ScreenWindowOverlay";
import type { ReactNode } from "react";

interface PageWrapperProps {
    children: ReactNode,
    page?: "home" | "students" | "clubs" | "events",
}

export default function (props: PageWrapperProps) {
  return (
    <main className="w-full h-screen flex flex-col items-center justify-start">
      <Navbar page={props.page} />
      <ScreenWindowOverlay padding={24} topInset={70} borderRadius={16} />
      <NoiseBackground />

      <div className="flex w-[95%] grow mb-8 p-32 flex-col gap-8 justify-start items-center">
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
