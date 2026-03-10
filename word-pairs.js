// 词库与词对逻辑

const WORD_PAIRS = [
  // 💘 Love & Relationships
  { civilianWord: "Crush", spyWord: "Admire" },
  { civilianWord: "Ghosting", spyWord: "Ignoring" },
  { civilianWord: "Situationship", spyWord: "Talking stage" },
  { civilianWord: "Soulmate", spyWord: "True love" },
  { civilianWord: "Breakup", spyWord: "Split up" },
  { civilianWord: "Flirting", spyWord: "Teasing" },
  { civilianWord: "Long distance", spyWord: "Far away relationship" },
  { civilianWord: "First date", spyWord: "First meeting" },
  { civilianWord: "Jealousy", spyWord: "Possessiveness" },
  { civilianWord: "Breadcrumbing", spyWord: "Leading on" },

  // 🧠 Identity & Personality
  { civilianWord: "Introvert", spyWord: "Shy" },
  { civilianWord: "Extrovert", spyWord: "Outgoing" },
  { civilianWord: "Empath", spyWord: "Sensitive" },
  { civilianWord: "Narcissist", spyWord: "Egotist" },
  { civilianWord: "Perfectionist", spyWord: "Overachiever" },
  { civilianWord: "Rebel", spyWord: "Troublemaker" },
  { civilianWord: "Overthinker", spyWord: "Anxious" },
  { civilianWord: "People pleaser", spyWord: "Pushover" },

  // 🚩 Red flags & Toxic culture
  { civilianWord: "Red flag", spyWord: "Warning sign" },
  { civilianWord: "Toxic", spyWord: "Unhealthy" },
  { civilianWord: "Gaslight", spyWord: "Manipulate" },
  { civilianWord: "Love bombing", spyWord: "Overwhelming affection" },
  { civilianWord: "Clingy", spyWord: "Needy" },
  { civilianWord: "Controlling", spyWord: "Possessive" },

  // 📱 Internet culture & Gen Z slang
  { civilianWord: "Vibe", spyWord: "Energy" },
  { civilianWord: "Rizz", spyWord: "Charm" },
  { civilianWord: "NPC", spyWord: "Background character" },
  { civilianWord: "Main character", spyWord: "Protagonist" },
  { civilianWord: "Delulu", spyWord: "Delusional" },
  { civilianWord: "Soft life", spyWord: "Easy life" },
  { civilianWord: "Glow up", spyWord: "Transformation" },
  { civilianWord: "Era", spyWord: "Phase" },
  { civilianWord: "Burnout", spyWord: "Exhaustion" },
  { civilianWord: "Aesthetics", spyWord: "Vibes" },

  // 🌍 Lifestyle & Values
  { civilianWord: "Minimalism", spyWord: "Simple living" },
  { civilianWord: "Wanderlust", spyWord: "Travel addiction" },
  { civilianWord: "Night owl", spyWord: "Insomniac" },
  { civilianWord: "Homebody", spyWord: "Hermit" },
  { civilianWord: "Gym rat", spyWord: "Fitness freak" },
  { civilianWord: "Vegan", spyWord: "Vegetarian" },
  { civilianWord: "Meditation", spyWord: "Mindfulness" },
  { civilianWord: "Therapy", spyWord: "Counseling" },

  // 🎭 Emotions & Mental health
  { civilianWord: "Anxiety", spyWord: "Stress" },
  { civilianWord: "Loneliness", spyWord: "Solitude" },
  { civilianWord: "Freedom", spyWord: "Independence" },
  { civilianWord: "Regret", spyWord: "Guilt" },
  { civilianWord: "Self-confidence", spyWord: "Self-esteem" },
  { civilianWord: "Healing", spyWord: "Recovery" },
  { civilianWord: "Boundaries", spyWord: "Limits" },
  { civilianWord: "Lost", spyWord: "Confused" },

  // 🔥 Hot takes & Social topics
  { civilianWord: "Feminism", spyWord: "Gender equality" },
  { civilianWord: "Cancel culture", spyWord: "Call-out culture" },
  { civilianWord: "Privilege", spyWord: "Advantage" },
  { civilianWord: "Open relationship", spyWord: "Polyamory" },
  { civilianWord: "Coming out", spyWord: "Being open" },
  { civilianWord: "Body positivity", spyWord: "Self-acceptance" },
  { civilianWord: "Hookup culture", spyWord: "Casual dating" },
  { civilianWord: "Age gap", spyWord: "Big age difference" },
];

function getRandomPair() {
  return WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
}

module.exports = {
  WORD_PAIRS,
  getRandomPair,
};

