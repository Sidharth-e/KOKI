import { type Transition, type Variants } from "motion/react";

export const snappySpring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 26,
};

export const microSpring: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 25,
};

export const panelMotion: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: snappySpring,
  },
  exit: {
    opacity: 0,
    x: 15,
    scale: 0.98,
    transition: {
      duration: 0.14,
      ease: [0.32, 0, 0.67, 0],
    },
  },
};

export const overlayMotion: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12 },
  },
};

export const modalMotion: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: -8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: snappySpring,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -6,
    transition: {
      duration: 0.12,
    },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.01,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: gentleSpring,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1 },
  },
};
