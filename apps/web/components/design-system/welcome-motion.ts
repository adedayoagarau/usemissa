/** Scoped, finite welcome interaction tokens; not general product animation defaults. */
const primitive = { stiffness: 145, damping: 21, mass: 1, anticipation: 0.16 };
export const welcomeMotion = {
  spring: {
    type: "spring" as const,
    stiffness: primitive.stiffness,
    damping: primitive.damping,
    mass: primitive.mass,
  },
  anticipation: primitive.anticipation,
  enter: 0.97,
  leave: 0.8,
  emissionDelay: 0.18,
  emissionInterval: 0.035,
  plumeDuration: 1.35,
  exitDuration: 0.65,
};
