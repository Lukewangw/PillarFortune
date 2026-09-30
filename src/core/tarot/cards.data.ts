import type { CardData } from "./types";

/**
 * Knowledge base for the 78-card Rider-Waite-Smith deck.
 *
 * Order: the 22 major arcana (0-21), then wands, cups, swords and pentacles,
 * each running Ace (1) through King (14). All interpretive text is original,
 * written in the second person, and never names another card, so it can be
 * used directly as LLM grounding without tripping the unseen-card validator.
 */
export const CARDS: readonly CardData[] = [
  // ---------------------------------------------------------------------------
  // Major arcana
  // ---------------------------------------------------------------------------
  {
    id: "major-00",
    name: "The Fool",
    nameZh: "愚者",
    arcana: "major",
    suit: null,
    number: 0,
    element: "air",
    keywords: {
      upright: ["new beginnings", "spontaneity", "leap of faith", "open curiosity"],
      reversed: ["recklessness", "hesitation", "naivety", "holding back"],
    },
    meaning: {
      upright:
        "You may be standing at the edge of something new, invited to step forward with curiosity rather than a complete plan. Trust your openness, travel light, and let genuine interest guide your first steps.",
      reversed:
        "You may be rushing ahead without checking the ground, or freezing because a leap feels too exposed. Look for a wiser balance: keep your enthusiasm, but pause long enough to notice what you might be overlooking.",
    },
    reflection: "What would you try if you trusted yourself to learn along the way?",
  },
  {
    id: "major-01",
    name: "The Magician",
    nameZh: "魔术师",
    arcana: "major",
    suit: null,
    number: 1,
    element: "air",
    keywords: {
      upright: ["manifestation", "skill", "focused will", "resourcefulness"],
      reversed: ["scattered energy", "untapped potential", "manipulation", "self-doubt"],
    },
    meaning: {
      upright:
        "You already hold more resources than you may realize: skills, relationships, ideas and resolve. When you bring your attention to a single aim and act deliberately, your plans have a real chance to take shape.",
      reversed:
        "Your talents may be scattered across too many directions, or you may be doubting abilities you plainly have. Be wary, too, of charm or clever words, yours or another's, being used to steer outcomes instead of plain honesty.",
    },
    reflection: "Which of your existing skills could you put to fuller use?",
  },
  {
    id: "major-02",
    name: "The High Priestess",
    nameZh: "女祭司",
    arcana: "major",
    suit: null,
    number: 2,
    element: "water",
    keywords: {
      upright: ["intuition", "inner knowing", "mystery", "stillness"],
      reversed: ["ignored instincts", "secrets", "disconnection", "inner noise"],
    },
    meaning: {
      upright:
        "You are invited to listen beneath the surface, where quiet impressions and dreams carry information logic can miss. Not everything needs to be decided now; stillness may reveal what effort cannot.",
      reversed:
        "You may be drowning out your own inner voice with busyness or other people's opinions. Something could also be hidden from view, so create quiet space and gently ask what you already sense but have not admitted.",
    },
    reflection: "What do you already know deep down but have not said aloud?",
  },
  {
    id: "major-03",
    name: "The Empress",
    nameZh: "皇后",
    arcana: "major",
    suit: null,
    number: 3,
    element: "earth",
    keywords: {
      upright: ["abundance", "nurturing", "creativity", "sensuality"],
      reversed: ["creative block", "overgiving", "smothering", "dependence"],
    },
    meaning: {
      upright:
        "You may be entering a fertile season where patience, care and creativity can help things grow. Nurture your projects, your relationships and your own comfort, and let yourself enjoy simple pleasures without guilt.",
      reversed:
        "You may be giving so much to others that your own well runs dry, or creativity feels stuck. Try reconnecting with what nourishes you, and notice where care has slipped into smothering or dependence.",
    },
    reflection: "What would it look like to nurture yourself as generously as you nurture others?",
  },
  {
    id: "major-04",
    name: "The Emperor",
    nameZh: "皇帝",
    arcana: "major",
    suit: null,
    number: 4,
    element: "fire",
    keywords: {
      upright: ["structure", "authority", "stability", "leadership"],
      reversed: ["rigidity", "heavy-handedness", "lack of discipline", "control issues"],
    },
    meaning: {
      upright:
        "You may benefit from clear structure, firm boundaries and a plan you can actually follow. Step into steady leadership of your own life, making decisions with a cool head and taking responsibility for the order you create.",
      reversed:
        "You may be gripping control too tightly, or feeling pressed by someone else's heavy-handed authority. If discipline has slipped instead, look for simple rules that support you rather than confine you.",
    },
    reflection: "Which boundary, if set clearly, would bring more steadiness to your days?",
  },
  {
    id: "major-05",
    name: "The Hierophant",
    nameZh: "教皇",
    arcana: "major",
    suit: null,
    number: 5,
    element: "earth",
    keywords: {
      upright: ["tradition", "shared values", "mentorship", "institutions"],
      reversed: ["rebellion", "questioning norms", "personal beliefs", "restrictive rules"],
    },
    meaning: {
      upright:
        "You may find value in established paths, trusted teachers or communities that share your values. Learning the conventional way first can give you a solid foundation, even if you later choose to adapt it.",
      reversed:
        "You may feel constrained by rules or expectations that no longer fit who you are. Questioning convention can be healthy; the task is to replace inherited beliefs with values you have genuinely examined, not simply to rebel.",
    },
    reflection: "Which beliefs did you inherit, and which have you truly chosen?",
  },
  {
    id: "major-06",
    name: "The Lovers",
    nameZh: "恋人",
    arcana: "major",
    suit: null,
    number: 6,
    element: "air",
    keywords: {
      upright: ["union", "harmony", "values alignment", "meaningful choice"],
      reversed: ["misalignment", "inner conflict", "disharmony", "avoided choice"],
    },
    meaning: {
      upright:
        "You may be drawn toward a deep connection or an important choice that reflects what you truly value. Whether it concerns a relationship or a direction, let honesty and shared values guide you rather than convenience.",
      reversed:
        "You may feel pulled between what you want and what you believe is right, or a relationship may feel out of sync. Look honestly at where your choices and your values have drifted apart.",
    },
    reflection: "What choice would you make if you honored your deepest values?",
  },
  {
    id: "major-07",
    name: "The Chariot",
    nameZh: "战车",
    arcana: "major",
    suit: null,
    number: 7,
    element: "water",
    keywords: {
      upright: ["determination", "willpower", "momentum", "self-discipline"],
      reversed: ["lost direction", "stalled momentum", "overcontrol", "opposing impulses"],
    },
    meaning: {
      upright:
        "You can make real headway when you bring competing impulses under one clear intention. Stay focused on your direction, keep your emotions steady, and let disciplined effort help you move past obstacles.",
      reversed:
        "You may be pushing hard without a clear heading, or feeling pulled in opposite directions until progress stalls. Pause to decide what you actually want, then direct your energy there instead of forcing every front at once.",
    },
    reflection: "Where do you need to choose one direction and commit to it?",
  },
  {
    id: "major-08",
    name: "Strength",
    nameZh: "力量",
    arcana: "major",
    suit: null,
    number: 8,
    element: "fire",
    keywords: {
      upright: ["courage", "compassion", "gentle power", "patience"],
      reversed: ["self-doubt", "insecurity", "impatience", "harshness"],
    },
    meaning: {
      upright:
        "You are invited to meet difficulty with calm courage rather than force. Gentle persistence, patience with yourself and kindness toward others can steady even strong emotions, showing that softness and resilience often work together.",
      reversed:
        "You may be doubting your own resilience, or letting frustration and fear take the lead. Rather than forcing yourself to be tough, reconnect with self-compassion and small acts of courage that rebuild your confidence.",
    },
    reflection: "Where could gentleness accomplish more than force right now?",
  },
  {
    id: "major-09",
    name: "The Hermit",
    nameZh: "隐士",
    arcana: "major",
    suit: null,
    number: 9,
    element: "earth",
    keywords: {
      upright: ["introspection", "solitude", "inner guidance", "soul-searching"],
      reversed: ["isolation", "loneliness", "withdrawal", "avoiding reflection"],
    },
    meaning: {
      upright:
        "You may need time away from outside noise to hear your own thoughts clearly. Stepping back for reflection is not avoidance; it can help you find a truer direction, which you might later share with others.",
      reversed:
        "Healthy solitude may have tipped into isolation, or you may be avoiding the quiet reflection you need. Consider reaching out to someone you trust while still protecting some time to think things through on your own.",
    },
    reflection: "What answer might you hear if you gave yourself an hour of silence?",
  },
  {
    id: "major-10",
    name: "Wheel of Fortune",
    nameZh: "命运之轮",
    arcana: "major",
    suit: null,
    number: 10,
    element: "fire",
    keywords: {
      upright: ["cycles", "turning point", "timing", "chance"],
      reversed: ["repeating patterns", "feeling stuck", "poor timing", "delays"],
    },
    meaning: {
      upright:
        "You may be at a turning point where circumstances shift in ways you did not fully plan. Life moves in cycles, so stay adaptable, notice emerging openings, and respond thoughtfully to what is changing around you.",
      reversed:
        "You may feel stuck in a repeating pattern or frustrated that timing is not on your side. Instead of resisting, look at what this cycle keeps teaching you and what small choice could help you break the loop.",
    },
    reflection: "What pattern keeps returning in your life, and what is it asking of you?",
  },
  {
    id: "major-11",
    name: "Justice",
    nameZh: "正义",
    arcana: "major",
    suit: null,
    number: 11,
    element: "air",
    keywords: {
      upright: ["fairness", "truth", "accountability", "cause and effect"],
      reversed: ["unfairness", "dishonesty", "avoiding accountability", "bias"],
    },
    meaning: {
      upright:
        "You are asked to weigh things honestly and accept responsibility for your part. Clear thinking, fairness and truthfulness can help you make a balanced decision, and your choices tend to come back to you in kind.",
      reversed:
        "You may sense that something is unfair, or you may be avoiding an honest look at your own role. Rather than assigning blame, gather the facts, own what is yours, and seek a resolution that feels genuinely balanced.",
    },
    reflection: "What would a truly fair outcome look like for everyone involved?",
  },
  {
    id: "major-12",
    name: "The Hanged Man",
    nameZh: "倒吊人",
    arcana: "major",
    suit: null,
    number: 12,
    element: "water",
    keywords: {
      upright: ["surrender", "pause", "new perspective", "letting go"],
      reversed: ["stalling", "resistance", "indecision", "needless sacrifice"],
    },
    meaning: {
      upright:
        "You may be in a pause that feels unproductive yet could be quietly reshaping how you see things. By letting go of the urge to force progress, you open space for a fresh perspective and a wiser next move.",
      reversed:
        "You may be stalling out of fear of change, or making sacrifices that no longer serve any purpose. Ask whether this waiting is still meaningful, or whether it is time to release the old view and choose.",
    },
    reflection: "How might this situation look if you viewed it from the opposite side?",
  },
  {
    id: "major-13",
    name: "Death",
    nameZh: "死神",
    arcana: "major",
    suit: null,
    number: 13,
    element: "water",
    keywords: {
      upright: ["endings", "transformation", "release", "transition"],
      reversed: ["fear of endings", "stagnation", "clinging", "slow transition"],
    },
    meaning: {
      upright:
        "Something in your life may be reaching a natural end, clearing room for what comes next. If you allow this chapter to close with honesty and gratitude, the transition can become genuine renewal rather than only loss.",
      reversed:
        "You may be holding on to a situation, habit or identity that has already run its course. Resisting the ending can prolong discomfort; consider what you are afraid to release and what might grow once you do.",
    },
    reflection: "What are you ready to let end so something new can begin?",
  },
  {
    id: "major-14",
    name: "Temperance",
    nameZh: "节制",
    arcana: "major",
    suit: null,
    number: 14,
    element: "fire",
    keywords: {
      upright: ["balance", "moderation", "patience", "blending"],
      reversed: ["imbalance", "excess", "impatience", "extremes"],
    },
    meaning: {
      upright:
        "You are encouraged to find the middle way, blending different needs, people or ideas into something workable. Patience and moderation matter here; small, steady adjustments may serve you better than dramatic swings in either direction.",
      reversed:
        "Something in your routine or relationships may feel out of balance, perhaps through overdoing, rushing or swinging between extremes. Notice where you have pushed too far in one direction, and what gentle recalibration could restore a sense of flow.",
    },
    reflection: "Where in your life would a little more moderation bring relief?",
  },
  {
    id: "major-15",
    name: "The Devil",
    nameZh: "恶魔",
    arcana: "major",
    suit: null,
    number: 15,
    element: "earth",
    keywords: {
      upright: ["attachment", "temptation", "unhealthy patterns", "shadow self"],
      reversed: ["breaking free", "self-awareness", "reclaiming choice", "private struggle"],
    },
    meaning: {
      upright:
        "You may feel bound to a habit, relationship or desire that gives short-term comfort but limits your freedom. Naming the pattern honestly, without shame, is often the first step toward loosening its hold on you.",
      reversed:
        "You may be seeing a limiting pattern clearly now, even if its old pull still surfaces in private moments. Reclaim your choices one at a time, and reach out for support if an attachment feels too heavy to carry alone.",
    },
    reflection: "What habit or attachment holds more power over you than you want?",
  },
  {
    id: "major-16",
    name: "The Tower",
    nameZh: "高塔",
    arcana: "major",
    suit: null,
    number: 16,
    element: "fire",
    keywords: {
      upright: ["sudden change", "revelation", "upheaval", "breakthrough"],
      reversed: ["resisting change", "delayed upheaval", "inner transformation", "avoidance"],
    },
    meaning: {
      upright:
        "You may face a sudden shift or revelation that shakes assumptions you thought were solid. Though unsettling, this kind of disruption can clear away what was unstable and reveal a more honest foundation to rebuild on.",
      reversed:
        "You may sense that something needs to change but keep postponing it, or the upheaval may be happening mostly inside you. Facing the truth sooner, in manageable steps, can feel gentler than waiting for circumstances to decide for you.",
    },
    reflection: "Which belief or structure in your life might be ready to be rebuilt?",
  },
  {
    id: "major-17",
    name: "The Star",
    nameZh: "星星",
    arcana: "major",
    suit: null,
    number: 17,
    element: "air",
    keywords: {
      upright: ["hope", "renewal", "inspiration", "serenity"],
      reversed: ["discouragement", "lost faith", "disconnection", "weariness"],
    },
    meaning: {
      upright:
        "After difficulty, you may feel a gentle return of hope and a clearer sense of purpose. Let yourself rest, trust that renewal is possible, and share your gifts openly, as quiet optimism can guide your next steps.",
      reversed:
        "You may feel discouraged or disconnected from the hope that usually sustains you. Rather than waiting for inspiration to return on its own, reconnect with small sources of meaning and let others remind you of your worth.",
    },
    reflection: "What small thing renews your sense of hope when you feel depleted?",
  },
  {
    id: "major-18",
    name: "The Moon",
    nameZh: "月亮",
    arcana: "major",
    suit: null,
    number: 18,
    element: "water",
    keywords: {
      upright: ["illusion", "uncertainty", "dreams", "subconscious"],
      reversed: ["lifting fog", "hidden fears", "surfacing truths", "self-deception"],
    },
    meaning: {
      upright:
        "Things may not be as they seem, and uncertainty could be stirring fears or vivid imaginings in you. Move slowly, trust your instincts while checking the facts, and allow clarity to arrive in its own time.",
      reversed:
        "The fog may be lifting, or you may be wrestling privately with fears you have not voiced. Gently question the stories your worry tells, and let what surfaces be examined in daylight rather than avoided.",
    },
    reflection: "Which fear might be distorting how you see this situation?",
  },
  {
    id: "major-19",
    name: "The Sun",
    nameZh: "太阳",
    arcana: "major",
    suit: null,
    number: 19,
    element: "fire",
    keywords: {
      upright: ["joy", "vitality", "confidence", "clarity"],
      reversed: ["muted joy", "overconfidence", "forced positivity", "delayed plans"],
    },
    meaning: {
      upright:
        "You may feel warmth, clarity and genuine enthusiasm returning to your days. Let yourself be seen, celebrate what is going well, and share your energy generously, since openness and playfulness tend to invite more of the same.",
      reversed:
        "Your natural joy may feel muted, or you may be pushing a cheerful front that hides real doubts. Look for simple pleasures that reconnect you with your playful side, while staying realistic about plans that need more time.",
    },
    reflection: "What would you do today if you let yourself feel fully confident?",
  },
  {
    id: "major-20",
    name: "Judgement",
    nameZh: "审判",
    arcana: "major",
    suit: null,
    number: 20,
    element: "fire",
    keywords: {
      upright: ["awakening", "honest review", "inner calling", "absolution"],
      reversed: ["self-criticism", "ignored calling", "hesitation", "regret"],
    },
    meaning: {
      upright:
        "You may be reaching a moment of honest review, seeing past choices clearly and feeling called toward a new chapter. Forgive what needs forgiving, including your own missteps, and answer the invitation to live more fully.",
      reversed:
        "A harsh inner critic may be keeping you from answering a call you already hear. Rather than replaying old mistakes, draw lessons from them and allow yourself the same second chance you would offer someone else.",
    },
    reflection: "What is calling you forward that you have been hesitant to answer?",
  },
  {
    id: "major-21",
    name: "The World",
    nameZh: "世界",
    arcana: "major",
    suit: null,
    number: 21,
    element: "earth",
    keywords: {
      upright: ["completion", "integration", "accomplishment", "wholeness"],
      reversed: ["loose ends", "lack of closure", "delayed completion"],
    },
    meaning: {
      upright:
        "You may be completing a meaningful cycle, bringing together lessons, efforts and experiences into a sense of wholeness. Take time to acknowledge how far you have come before stepping into the next journey with confidence.",
      reversed:
        "You may be close to finishing something but held back by loose ends, or you may be seeking closure you have not yet allowed yourself. Identify what remains incomplete and give it the attention needed to feel finished.",
    },
    reflection: "What have you accomplished that deserves to be fully acknowledged?",
  },

  // ---------------------------------------------------------------------------
  // Wands (fire)
  // ---------------------------------------------------------------------------
  {
    id: "wands-01",
    name: "Ace of Wands",
    nameZh: "权杖王牌",
    arcana: "minor",
    suit: "wands",
    number: 1,
    element: "fire",
    keywords: {
      upright: ["inspiration", "creative spark", "new venture", "enthusiasm"],
      reversed: ["low motivation", "creative delays", "hesitation", "unfocused energy"],
    },
    meaning: {
      upright:
        "A fresh spark of inspiration or desire may be arriving, full of creative potential. You are encouraged to act on it while the energy is alive, taking a concrete first step instead of only imagining possibilities.",
      reversed:
        "You may feel an idea tugging at you but struggle to find the motivation or timing to begin. Explore what is dampening your enthusiasm, and try one small action that rekindles your interest without pressure.",
    },
    reflection: "Which idea excites you enough to act on it now?",
  },
  {
    id: "wands-02",
    name: "Two of Wands",
    nameZh: "权杖二",
    arcana: "minor",
    suit: "wands",
    number: 2,
    element: "fire",
    keywords: {
      upright: ["planning", "future vision", "decisions", "discovery"],
      reversed: ["playing it safe", "fear of change", "indecision", "limited vision"],
    },
    meaning: {
      upright:
        "What you have built so far may feel too small for the wider horizon you now want to explore. Clarify your long-term vision, weigh your options, and make a plan that stretches you beyond familiar ground.",
      reversed:
        "You may be hesitating to leave your comfort zone, planning endlessly without committing to a direction. Consider whether fear of the unknown is keeping you small, and what modest move would test your bigger idea.",
    },
    reflection: "Where do you want to be a year from now, and why?",
  },
  {
    id: "wands-03",
    name: "Three of Wands",
    nameZh: "权杖三",
    arcana: "minor",
    suit: "wands",
    number: 3,
    element: "fire",
    keywords: {
      upright: ["expansion", "foresight", "progress", "new horizons"],
      reversed: ["unexpected delays", "limited foresight", "frustration", "obstacles"],
    },
    meaning: {
      upright:
        "Your earlier efforts may be gathering momentum, and you can now look further ahead with growing confidence. Keep your vision broad, stay open to opportunities beyond your usual circle, and prepare for the next stage of growth.",
      reversed:
        "Progress may feel slower than you hoped, or plans may be meeting obstacles you did not anticipate. Use the pause to refine your approach, revisit your assumptions, and remember that delays are not the same as failure.",
    },
    reflection: "What opportunity might you see if you looked a little further ahead?",
  },
  {
    id: "wands-04",
    name: "Four of Wands",
    nameZh: "权杖四",
    arcana: "minor",
    suit: "wands",
    number: 4,
    element: "fire",
    keywords: {
      upright: ["celebration", "homecoming", "community", "milestones"],
      reversed: ["unsettled home", "lack of belonging", "strained celebrations", "transition"],
    },
    meaning: {
      upright:
        "You may have reason to celebrate a milestone, a sense of belonging, or the people who make you feel at home. Pause to enjoy what you have built together, and let shared gratitude deepen those bonds.",
      reversed:
        "You may feel unsettled at home or disconnected from a group you want to belong to. Celebrations or transitions could feel strained, so focus on honest conversations and small gestures that rebuild a sense of welcome.",
    },
    reflection: "Who helps you feel at home, and how can you honor them?",
  },
  {
    id: "wands-05",
    name: "Five of Wands",
    nameZh: "权杖五",
    arcana: "minor",
    suit: "wands",
    number: 5,
    element: "fire",
    keywords: {
      upright: ["competition", "friction", "rivalry", "clashing ideas"],
      reversed: ["conflict avoidance", "inner tension", "common ground", "cooling off"],
    },
    meaning: {
      upright:
        "You may find yourself amid competing voices, where everyone pushes their own agenda. Healthy friction can sharpen ideas, so engage honestly, listen for what others are really fighting for, and look for ways to cooperate.",
      reversed:
        "You may be avoiding a necessary disagreement, or carrying tension that has turned inward. Consider whether a calm, direct conversation could clear the air, and look for common ground rather than keeping score.",
    },
    reflection: "What are you and the other side both really trying to protect?",
  },
  {
    id: "wands-06",
    name: "Six of Wands",
    nameZh: "权杖六",
    arcana: "minor",
    suit: "wands",
    number: 6,
    element: "fire",
    keywords: {
      upright: ["recognition", "achievement", "confidence", "public praise"],
      reversed: ["unnoticed effort", "need for approval", "arrogance", "private progress"],
    },
    meaning: {
      upright:
        "You may be receiving, or ready to claim, recognition for effort you have genuinely put in. Let yourself enjoy the acknowledgment with humility, and use the confidence it brings to keep moving toward your goals.",
      reversed:
        "Your achievements may be going unnoticed, or you may be relying too heavily on outside approval to feel worthy. Try measuring progress by your own standards, and notice if pride is keeping you from accepting help.",
    },
    reflection: "How would you define success if no one else were watching?",
  },
  {
    id: "wands-07",
    name: "Seven of Wands",
    nameZh: "权杖七",
    arcana: "minor",
    suit: "wands",
    number: 7,
    element: "fire",
    keywords: {
      upright: ["standing firm", "perseverance", "defending boundaries", "conviction"],
      reversed: ["overwhelm", "defensiveness", "giving in", "worn down"],
    },
    meaning: {
      upright:
        "You may need to stand your ground as others challenge your position or compete for the same space. Stay anchored in your convictions, defend what matters to you, and choose your battles with care.",
      reversed:
        "You may feel worn down by constant pushback, tempted to give in or to defend yourself against every small challenge. Decide which positions truly matter, and let the rest go so your energy lasts.",
    },
    reflection: "Which position is truly worth defending, and which can you release?",
  },
  {
    id: "wands-08",
    name: "Eight of Wands",
    nameZh: "权杖八",
    arcana: "minor",
    suit: "wands",
    number: 8,
    element: "fire",
    keywords: {
      upright: ["swift action", "fast pace", "rapid progress", "incoming news"],
      reversed: ["delays", "hasty moves", "miscommunication", "waiting"],
    },
    meaning: {
      upright:
        "Things may be moving quickly around you, with news, ideas or opportunities arriving in rapid succession. Stay focused and responsive, act while momentum is high, and keep your aim clear so speed does not turn into chaos.",
      reversed:
        "You may feel frustrated by delays, or you may be rushing so fast that details and messages get lost. Slow down enough to communicate clearly, and trust that well-timed action often beats hurried action.",
    },
    reflection: "What deserves your quick action, and what would benefit from waiting?",
  },
  {
    id: "wands-09",
    name: "Nine of Wands",
    nameZh: "权杖九",
    arcana: "minor",
    suit: "wands",
    number: 9,
    element: "fire",
    keywords: {
      upright: ["resilience", "persistence", "boundaries", "final push"],
      reversed: ["weariness", "overdefensiveness", "stubbornness", "running on empty"],
    },
    meaning: {
      upright:
        "You may be tired from a long effort yet possibly closer to the finish than it feels. Draw on the lessons you have earned, protect your energy with sensible boundaries, and keep going one steady step at a time.",
      reversed:
        "You may be running low on reserves, guarding yourself so tightly that support cannot reach you. Consider whether it is time to rest, ask for help, or let go of a fight that no longer needs you.",
    },
    reflection: "What support would help you carry this last stretch with more ease?",
  },
  {
    id: "wands-10",
    name: "Ten of Wands",
    nameZh: "权杖十",
    arcana: "minor",
    suit: "wands",
    number: 10,
    element: "fire",
    keywords: {
      upright: ["heavy burden", "responsibility", "overcommitment", "hard work"],
      reversed: ["delegating", "setting down burdens", "refusing help", "overload"],
    },
    meaning: {
      upright:
        "You may be carrying more responsibility than one person comfortably can, pushing forward out of duty. Honor your commitment, but look at which tasks are truly yours and whether some weight could be shared or dropped.",
      reversed:
        "You may be clinging to every task out of habit or pride, or finally realizing you cannot hold it all. Setting some burdens down is not failure; it can free you to focus on what matters most.",
    },
    reflection: "Which responsibility could you delegate, postpone or release this week?",
  },
  {
    id: "wands-11",
    name: "Page of Wands",
    nameZh: "权杖侍从",
    arcana: "minor",
    suit: "wands",
    number: 11,
    element: "fire",
    keywords: {
      upright: ["curiosity", "exploration", "eager learning", "free spirit"],
      reversed: ["scattered ideas", "hesitant beginnings", "impatience", "self-doubt"],
    },
    meaning: {
      upright:
        "You may feel a fresh curiosity pulling you toward something new to learn or explore. Follow that enthusiasm with a playful, open mind, and share your ideas even if they are still rough around the edges.",
      reversed:
        "Your enthusiasm may be bouncing between ideas without landing, or self-doubt may be keeping a promising project on hold. Choose one spark to explore properly, and give it enough time before you decide whether it works.",
    },
    reflection: "What would you explore if you gave yourself permission to be a beginner?",
  },
  {
    id: "wands-12",
    name: "Knight of Wands",
    nameZh: "权杖骑士",
    arcana: "minor",
    suit: "wands",
    number: 12,
    element: "fire",
    keywords: {
      upright: ["passion", "bold action", "adventure", "charisma"],
      reversed: ["impulsiveness", "haste", "short fuse", "unfinished pursuits"],
    },
    meaning: {
      upright:
        "You may feel a surge of energy and a desire to move boldly toward what excites you. Channel that passion into purposeful action, embrace adventure, and let your confidence inspire others without steamrolling them.",
      reversed:
        "Your drive may be turning into impatience or recklessness, leaving projects half finished and tempers short. Before charging ahead, ask whether this is the right direction, and pace yourself so enthusiasm does not burn out.",
    },
    reflection: "Where could your passion use a clearer sense of direction?",
  },
  {
    id: "wands-13",
    name: "Queen of Wands",
    nameZh: "权杖王后",
    arcana: "minor",
    suit: "wands",
    number: 13,
    element: "fire",
    keywords: {
      upright: ["confidence", "warmth", "vibrancy", "independence"],
      reversed: ["insecurity", "jealousy", "overextension", "irritability"],
    },
    meaning: {
      upright:
        "You may be at your most magnetic when you show up confidently and warmly, as your full self. Trust your abilities, take up space without apology, and let your enthusiasm encourage others to shine too.",
      reversed:
        "Your confidence may feel shaky, or you may be spreading yourself so thin that warmth turns into irritation or comparison. Reconnect with what makes you feel alive, and set limits that protect your energy and self-respect.",
    },
    reflection: "Where are you dimming yourself to make others comfortable?",
  },
  {
    id: "wands-14",
    name: "King of Wands",
    nameZh: "权杖国王",
    arcana: "minor",
    suit: "wands",
    number: 14,
    element: "fire",
    keywords: {
      upright: ["visionary leadership", "boldness", "big-picture thinking", "initiative"],
      reversed: ["impulsive decisions", "unrealistic expectations", "domineering"],
    },
    meaning: {
      upright:
        "You may be ready to lead with vision, turning big ideas into direction that others want to follow. Act decisively, take responsibility for the bigger picture, and inspire people by modeling the commitment you hope to see.",
      reversed:
        "Your vision may be outrunning your planning, or leadership may be tipping into impatience and control. Check whether you are listening to others, and whether your expectations of yourself and them are realistic.",
    },
    reflection: "What vision are you willing to take full ownership of?",
  },

  // ---------------------------------------------------------------------------
  // Cups (water)
  // ---------------------------------------------------------------------------
  {
    id: "cups-01",
    name: "Ace of Cups",
    nameZh: "圣杯王牌",
    arcana: "minor",
    suit: "cups",
    number: 1,
    element: "water",
    keywords: {
      upright: ["love", "emotional renewal", "compassion", "new connection"],
      reversed: ["blocked feelings", "emotional emptiness", "guarded heart", "self-love"],
    },
    meaning: {
      upright:
        "A new wave of feeling may be opening in you, whether through love, friendship, creativity or compassion. Let yourself receive and express emotion freely, and notice how kindness toward yourself can overflow into your relationships.",
      reversed:
        "Your feelings may be bottled up, or a guarded heart may be keeping new connection at a distance. Make room to acknowledge what you feel, and offer yourself the tenderness you would readily give to someone you love.",
    },
    reflection: "Where in your life are you ready to let more love in?",
  },
  {
    id: "cups-02",
    name: "Two of Cups",
    nameZh: "圣杯二",
    arcana: "minor",
    suit: "cups",
    number: 2,
    element: "water",
    keywords: {
      upright: ["partnership", "mutual respect", "attraction", "shared feelings"],
      reversed: ["misunderstanding", "distrust", "uneven effort", "drifting apart"],
    },
    meaning: {
      upright:
        "You may be experiencing a connection built on mutual respect, attraction or shared purpose. Whether romantic, platonic or professional, this bond tends to thrive when you both give and receive openly, meeting each other as equals.",
      reversed:
        "A relationship may feel out of balance, with misunderstandings or uneven effort creating distance. Talk honestly about what each of you needs, and remember that a healthy partnership also depends on your relationship with yourself.",
    },
    reflection: "What does a truly equal partnership look like to you?",
  },
  {
    id: "cups-03",
    name: "Three of Cups",
    nameZh: "圣杯三",
    arcana: "minor",
    suit: "cups",
    number: 3,
    element: "water",
    keywords: {
      upright: ["friendship", "shared joy", "gatherings", "mutual support"],
      reversed: ["overindulgence", "gossip", "social fatigue", "feeling left out"],
    },
    meaning: {
      upright:
        "You may find joy in friendship, community and shared celebration right now. Reach out to the people who lift you up, enjoy time together without an agenda, and let collective support carry some of your load.",
      reversed:
        "Social life may feel draining, cliquish or excessive, or you may feel left out of a circle that matters to you. Consider which connections truly nourish you, and balance good times with rest and honest conversation.",
    },
    reflection: "Which friendships deserve more of your time and celebration?",
  },
  {
    id: "cups-04",
    name: "Four of Cups",
    nameZh: "圣杯四",
    arcana: "minor",
    suit: "cups",
    number: 4,
    element: "water",
    keywords: {
      upright: ["apathy", "contemplation", "reevaluation", "overlooked offers"],
      reversed: ["renewed interest", "reengagement", "deeper withdrawal"],
    },
    meaning: {
      upright:
        "You may feel bored, detached or unsatisfied with what is currently in front of you. Taking time to reflect is worthwhile, but check whether you are overlooking an offer or support that could renew your interest.",
      reversed:
        "You may be emerging from a period of apathy and noticing possibilities again, or withdrawing even further into yourself. Either way, gently reengage with one thing that once brought you meaning and see how it feels.",
    },
    reflection: "What might you be overlooking because you are focused on what is missing?",
  },
  {
    id: "cups-05",
    name: "Five of Cups",
    nameZh: "圣杯五",
    arcana: "minor",
    suit: "cups",
    number: 5,
    element: "water",
    keywords: {
      upright: ["disappointment", "regret", "loss", "grieving"],
      reversed: ["acceptance", "self-forgiveness", "moving forward", "private sorrow"],
    },
    meaning: {
      upright:
        "You may be focused on what went wrong, feeling the weight of a loss or disappointment. Your grief deserves room, and when you are ready, notice what still remains for you and what might be rebuilt.",
      reversed:
        "You may be slowly making peace with a disappointment, or keeping sorrow private instead of letting it move through you. Gentle acceptance and self-forgiveness can help you turn around and see the support still standing behind you.",
    },
    reflection: "What is still standing for you, even after this disappointment?",
  },
  {
    id: "cups-06",
    name: "Six of Cups",
    nameZh: "圣杯六",
    arcana: "minor",
    suit: "cups",
    number: 6,
    element: "water",
    keywords: {
      upright: ["nostalgia", "fond memories", "innocence", "simple kindness"],
      reversed: ["idealized past", "clinging to memories", "lost playfulness"],
    },
    meaning: {
      upright:
        "You may be revisiting memories, old friends or places that remind you of simpler times. Let that warmth reconnect you with innocence and generosity, and consider how small, kind gestures could brighten someone's day now.",
      reversed:
        "You may be idealizing the past or holding on to how things used to be, making the present feel lacking. Honor what those memories gave you, then bring their playfulness and warmth into the life you are living today.",
    },
    reflection: "What part of your younger self would you like to bring back?",
  },
  {
    id: "cups-07",
    name: "Seven of Cups",
    nameZh: "圣杯七",
    arcana: "minor",
    suit: "cups",
    number: 7,
    element: "water",
    keywords: {
      upright: ["many options", "wishful thinking", "imagination", "daydreaming"],
      reversed: ["clearer focus", "decisiveness", "reality check", "choice paralysis"],
    },
    meaning: {
      upright:
        "You may be facing many tempting options, some more realistic than others. Enjoy imagining the possibilities, but test each one against your values and practical realities before committing, since not every shiny idea holds up.",
      reversed:
        "You may be cutting through fantasy toward a clearer decision, or feeling paralyzed by too many possibilities. Narrow your focus to the options that genuinely fit your life, and take one grounded step toward the best of them.",
    },
    reflection: "Which option would you still choose if you imagined living with it daily?",
  },
  {
    id: "cups-08",
    name: "Eight of Cups",
    nameZh: "圣杯八",
    arcana: "minor",
    suit: "cups",
    number: 8,
    element: "water",
    keywords: {
      upright: ["walking away", "disillusionment", "deeper meaning", "moving on"],
      reversed: ["hesitation to leave", "aimless drifting", "one more try"],
    },
    meaning: {
      upright:
        "You may sense that something which once satisfied you no longer does, even if it looks fine from the outside. Walking away to seek deeper meaning can take courage, and it may be the more honest path for you.",
      reversed:
        "You may know it is time to move on yet keep hesitating, or drift away without a clear reason. Get honest about what you are seeking, and whether it can be found by staying, leaving or changing course.",
    },
    reflection: "What are you truly searching for, and can your current path offer it?",
  },
  {
    id: "cups-09",
    name: "Nine of Cups",
    nameZh: "圣杯九",
    arcana: "minor",
    suit: "cups",
    number: 9,
    element: "water",
    keywords: {
      upright: ["contentment", "satisfaction", "gratitude", "emotional fulfillment"],
      reversed: ["dissatisfaction", "indulgence", "hollow pleasures", "unmet needs"],
    },
    meaning: {
      upright:
        "You may feel a well-earned sense of contentment, enjoying what you have worked toward or hoped for. Savor these good things with gratitude, and notice which of your wishes truly nourish you rather than simply impress others.",
      reversed:
        "You may have much of what you wanted yet still feel something is missing, or be indulging to fill a gap. Look beneath the surface for the deeper need, and seek satisfaction that comes from within.",
    },
    reflection: "What would true contentment feel like to you, beyond getting what you want?",
  },
  {
    id: "cups-10",
    name: "Ten of Cups",
    nameZh: "圣杯十",
    arcana: "minor",
    suit: "cups",
    number: 10,
    element: "water",
    keywords: {
      upright: ["family harmony", "belonging", "shared happiness", "emotional security"],
      reversed: ["family tension", "unrealistic ideals", "keeping up appearances", "disconnection"],
    },
    meaning: {
      upright:
        "You may be experiencing, or longing for, a deep sense of emotional harmony with the people you love. Nurture those bonds with presence and appreciation, remembering that lasting happiness grows from everyday care rather than perfection.",
      reversed:
        "Home or family life may feel strained, or you may be holding everyone to an ideal that no one could meet. Focus on genuine connection over appearances, and talk openly about what each person truly needs to feel secure.",
    },
    reflection: "What small act would bring more warmth to your closest relationships?",
  },
  {
    id: "cups-11",
    name: "Page of Cups",
    nameZh: "圣杯侍从",
    arcana: "minor",
    suit: "cups",
    number: 11,
    element: "water",
    keywords: {
      upright: ["creative surprises", "intuitive messages", "tenderness", "emotional curiosity"],
      reversed: ["guarded feelings", "escapism", "blocked creativity", "oversensitivity"],
    },
    meaning: {
      upright:
        "You may receive an unexpected idea, feeling or invitation that softens your heart. Approach it with childlike curiosity, trust your intuition, and allow yourself to express emotions and creativity without worrying about how it looks.",
      reversed:
        "You may be guarding your softer feelings, or retreating into daydreams when real emotions feel too exposed. Treat your sensitivity as a guide rather than a flaw, and give creative impulses a safe, playful outlet.",
    },
    reflection: "What message might your feelings be trying to send you right now?",
  },
  {
    id: "cups-12",
    name: "Knight of Cups",
    nameZh: "圣杯骑士",
    arcana: "minor",
    suit: "cups",
    number: 12,
    element: "water",
    keywords: {
      upright: ["romance", "charm", "idealism", "heartfelt offers"],
      reversed: ["moodiness", "fickleness", "overidealizing", "empty promises"],
    },
    meaning: {
      upright:
        "You may feel moved to follow your heart, offering or receiving affection, creativity or a heartfelt invitation. Let idealism inspire you, while making sure your gestures and plans are grounded enough to be followed through.",
      reversed:
        "Your emotions may be swinging quickly, or you may be chasing an ideal that does not match reality. Notice whether promises, yours or someone else's, exceed what can realistically be delivered, and let actions speak louder than words.",
    },
    reflection: "How can you follow your heart while keeping your feet on the ground?",
  },
  {
    id: "cups-13",
    name: "Queen of Cups",
    nameZh: "圣杯王后",
    arcana: "minor",
    suit: "cups",
    number: 13,
    element: "water",
    keywords: {
      upright: ["compassion", "emotional depth", "intuitive care", "calm presence"],
      reversed: ["emotional overwhelm", "codependence", "self-neglect", "blurred boundaries"],
    },
    meaning: {
      upright:
        "You may be called to lead with compassion, holding space for your own feelings and those of others. Trust your emotional intelligence and intuition, while staying calm enough to offer care without losing yourself in it.",
      reversed:
        "You may be absorbing so much of other people's emotion that your own needs go unmet. Reconnect with your inner calm, set kinder boundaries, and remember that caring for yourself makes your compassion more sustainable.",
    },
    reflection: "How can you care deeply for others without losing touch with yourself?",
  },
  {
    id: "cups-14",
    name: "King of Cups",
    nameZh: "圣杯国王",
    arcana: "minor",
    suit: "cups",
    number: 14,
    element: "water",
    keywords: {
      upright: ["emotional balance", "diplomacy", "calm wisdom", "steady support"],
      reversed: ["suppressed feelings", "emotional volatility", "coldness"],
    },
    meaning: {
      upright:
        "You may be asked to stay steady amid strong emotions, your own or others', and respond with calm compassion. Balance heart and head, offering support through diplomacy and patience rather than reacting in the moment.",
      reversed:
        "You may be bottling up feelings until they leak out as moodiness, or using calm control to avoid vulnerability. Acknowledge what you actually feel, and find healthy outlets so emotions can be expressed rather than managed away.",
    },
    reflection: "How can you stay calm without shutting down what you feel?",
  },

  // ---------------------------------------------------------------------------
  // Swords (air)
  // ---------------------------------------------------------------------------
  {
    id: "swords-01",
    name: "Ace of Swords",
    nameZh: "宝剑王牌",
    arcana: "minor",
    suit: "swords",
    number: 1,
    element: "air",
    keywords: {
      upright: ["mental clarity", "sharp insight", "truth", "decisive thinking"],
      reversed: ["confusion", "clouded thinking", "harsh words", "mental blocks"],
    },
    meaning: {
      upright:
        "A moment of clarity may cut through confusion, showing you the truth of a situation or sparking a fresh idea. Use this insight to communicate honestly and decide clearly, while choosing your words with care.",
      reversed:
        "Your thinking may feel clouded, or an idea may not yet be ready to express clearly. Take time to gather information, question your assumptions, and be careful that sharp words or rushed conclusions do not cause harm.",
    },
    reflection: "What truth do you see when you set your assumptions aside?",
  },
  {
    id: "swords-02",
    name: "Two of Swords",
    nameZh: "宝剑二",
    arcana: "minor",
    suit: "swords",
    number: 2,
    element: "air",
    keywords: {
      upright: ["stalemate", "indecision", "difficult choices", "denial"],
      reversed: ["information overload", "overthinking", "decision fatigue"],
    },
    meaning: {
      upright:
        "You may be avoiding a difficult choice, hoping that if you do not look, it will resolve on its own. Remove the blindfold gently: gather the facts, check in with your feelings, and let yourself decide.",
      reversed:
        "You may feel overwhelmed by information or opinions, cycling through options until you are exhausted. Step back from the noise, identify the one or two factors that matter most, and trust that a good-enough decision can move you forward.",
    },
    reflection: "What are you avoiding seeing because a decision would follow?",
  },
  {
    id: "swords-03",
    name: "Three of Swords",
    nameZh: "宝剑三",
    arcana: "minor",
    suit: "swords",
    number: 3,
    element: "air",
    keywords: {
      upright: ["heartbreak", "sorrow", "painful truth", "emotional hurt"],
      reversed: ["recovery", "releasing pain", "forgiveness", "lingering hurt"],
    },
    meaning: {
      upright:
        "You may be feeling the sting of a painful truth, a disappointment or words that cut deeply. Allow yourself to acknowledge the hurt honestly, since sorrow that is named and felt tends to ease with time.",
      reversed:
        "You may be slowly releasing an old hurt, or keeping pain locked inside where it quietly lingers. Consider talking it through with someone you trust, and let forgiveness, including toward yourself, unfold at its own pace.",
    },
    reflection: "What hurt needs your acknowledgment before it can begin to soften?",
  },
  {
    id: "swords-04",
    name: "Four of Swords",
    nameZh: "宝剑四",
    arcana: "minor",
    suit: "swords",
    number: 4,
    element: "air",
    keywords: {
      upright: ["rest", "restoration", "quiet retreat", "mental recharge"],
      reversed: ["restlessness", "resisting rest", "overwork"],
    },
    meaning: {
      upright:
        "You may need a genuine pause to rest your mind and recover from recent strain. Resting is not falling behind; quiet time and simple routines can restore the clarity you need for what comes next.",
      reversed:
        "You may be pushing on despite clear signs that you need rest, or struggling to switch off even when you try. Consider what makes stillness hard for you right now, and protect small pockets of genuine downtime.",
    },
    reflection: "What would true rest look like for you this week?",
  },
  {
    id: "swords-05",
    name: "Five of Swords",
    nameZh: "宝剑五",
    arcana: "minor",
    suit: "swords",
    number: 5,
    element: "air",
    keywords: {
      upright: ["conflict", "hollow victory", "self-interest", "unfair tactics"],
      reversed: ["reconciliation", "making amends", "lingering resentment"],
    },
    meaning: {
      upright:
        "You may be in a conflict where winning could cost more than it is worth in trust or goodwill. Consider whether being right matters more than the relationship, and look for a resolution you can feel proud of later.",
      reversed:
        "You may be ready to lay down arms after a conflict, or still carrying resentment about how things ended. Consider making amends where you can, and release the need to replay who was right.",
    },
    reflection: "What would you gain by letting go of the need to win?",
  },
  {
    id: "swords-06",
    name: "Six of Swords",
    nameZh: "宝剑六",
    arcana: "minor",
    suit: "swords",
    number: 6,
    element: "air",
    keywords: {
      upright: ["transition", "calmer waters", "leaving behind", "gradual progress"],
      reversed: ["resisting transition", "unfinished business", "emotional baggage"],
    },
    meaning: {
      upright:
        "You may be leaving a difficult situation behind and moving toward calmer ground, even if the journey feels quiet or bittersweet. Take what you have learned with you, and allow the transition to unfold at a gentle pace.",
      reversed:
        "You may feel unable to move on, or you may be carrying unresolved issues into a new situation. Before pushing forward, look at what you are still holding, and decide what truly needs to come with you.",
    },
    reflection: "What are you ready to leave behind as you move forward?",
  },
  {
    id: "swords-07",
    name: "Seven of Swords",
    nameZh: "宝剑七",
    arcana: "minor",
    suit: "swords",
    number: 7,
    element: "air",
    keywords: {
      upright: ["deception", "strategy", "secrecy", "shortcuts"],
      reversed: ["coming clean", "confession", "imposter feelings", "guilty conscience"],
    },
    meaning: {
      upright:
        "You may be tempted to take a shortcut, work around others quietly, or keep something hidden. Strategy can be wise, but check whether anyone involved, including you, is sidestepping honesty or accountability.",
      reversed:
        "You may feel ready to come clean, or you may be quietly deceiving yourself about a situation or your own worth. Honest conversations, even uncomfortable ones, can relieve the weight of secrets and help you rebuild trust.",
    },
    reflection: "Where might a more transparent approach serve you better than a clever one?",
  },
  {
    id: "swords-08",
    name: "Eight of Swords",
    nameZh: "宝剑八",
    arcana: "minor",
    suit: "swords",
    number: 8,
    element: "air",
    keywords: {
      upright: ["feeling trapped", "limiting beliefs", "self-restriction", "helplessness"],
      reversed: ["loosening restrictions", "self-liberation", "inner critic", "fresh options"],
    },
    meaning: {
      upright:
        "You may feel trapped by circumstances, yet some of the bindings could be beliefs rather than facts. Question stories that say you have no options, and look for one small move that reminds you of your choices.",
      reversed:
        "You may be loosening the grip of limiting thoughts and seeing exits you missed before. If your inner critic still speaks loudly, meet it with evidence and compassion, and keep taking steps that widen your sense of possibility.",
    },
    reflection: "Which belief about your situation might not actually be true?",
  },
  {
    id: "swords-09",
    name: "Nine of Swords",
    nameZh: "宝剑九",
    arcana: "minor",
    suit: "swords",
    number: 9,
    element: "air",
    keywords: {
      upright: ["worry", "sleepless nights", "racing thoughts", "inner turmoil"],
      reversed: ["private fears", "releasing worry", "reaching out", "returning perspective"],
    },
    meaning: {
      upright:
        "Worries may feel loudest at night, when your mind replays fears and worst-case scenarios. Remember that anxious thoughts are not predictions; writing them down, talking with someone you trust, or grounding in the present can ease their hold.",
      reversed:
        "You may be keeping fears to yourself, letting them grow in private, or you may be ready to release some of that mental weight. Sharing what troubles you can bring perspective, and support is worth seeking if worry feels overwhelming.",
    },
    reflection: "Which worry might feel lighter if you shared it with someone?",
  },
  {
    id: "swords-10",
    name: "Ten of Swords",
    nameZh: "宝剑十",
    arcana: "minor",
    suit: "swords",
    number: 10,
    element: "air",
    keywords: {
      upright: ["painful ending", "rock bottom", "betrayal", "exhaustion"],
      reversed: ["slow recovery", "resisting closure", "lessons learned", "rising again"],
    },
    meaning: {
      upright:
        "You may feel that a situation has reached its lowest point, perhaps through betrayal, exhaustion or a painful ending. As hard as this is, acknowledging that this chapter is over can free you to rest, gather support and slowly rebuild.",
      reversed:
        "You may be beginning to recover from a hard ending, or resisting the fact that something is truly over. Let yourself grieve what was lost, notice the lessons you are carrying forward, and give yourself time to regain your footing.",
    },
    reflection: "What has this ending taught you that you want to carry forward?",
  },
  {
    id: "swords-11",
    name: "Page of Swords",
    nameZh: "宝剑侍从",
    arcana: "minor",
    suit: "swords",
    number: 11,
    element: "air",
    keywords: {
      upright: ["inquisitiveness", "new ideas", "vigilance", "honest questions"],
      reversed: ["all talk", "hasty words", "gossip", "defensiveness"],
    },
    meaning: {
      upright:
        "You may feel mentally alert and eager to learn, asking sharp questions and seeking the truth of things. Channel that curiosity into research and honest conversation, while staying open to answers you did not expect.",
      reversed:
        "You may be talking more than acting, or speaking before thinking things through. Notice whether curiosity has slipped into gossip or defensiveness, and let your ideas mature before you share them widely.",
    },
    reflection: "What question are you most curious to explore right now?",
  },
  {
    id: "swords-12",
    name: "Knight of Swords",
    nameZh: "宝剑骑士",
    arcana: "minor",
    suit: "swords",
    number: 12,
    element: "air",
    keywords: {
      upright: ["ambition", "decisive action", "directness", "fast thinking"],
      reversed: ["rash decisions", "tactlessness", "restless mind", "unfocused drive"],
    },
    meaning: {
      upright:
        "You may feel driven to act quickly on your ideas and speak your mind directly. That focus and speed can cut through hesitation, as long as you stay open to feedback and consider the people in your path.",
      reversed:
        "You may be charging ahead so fast that details get missed or words land harder than intended. Slow down, think through the consequences, and make sure your urgency serves the goal rather than your frustration.",
    },
    reflection: "Where would slowing down make your message more effective?",
  },
  {
    id: "swords-13",
    name: "Queen of Swords",
    nameZh: "宝剑王后",
    arcana: "minor",
    suit: "swords",
    number: 13,
    element: "air",
    keywords: {
      upright: ["clear boundaries", "independent thinking", "honesty", "perceptiveness"],
      reversed: ["bitterness", "harsh criticism", "cold distance", "closed heart"],
    },
    meaning: {
      upright:
        "Your clearest power may come from thinking independently, speaking plainly and setting firm boundaries. Let past experience sharpen your perception, and pair honesty with kindness so your directness clarifies rather than wounds.",
      reversed:
        "Past hurts may be making you guarded, critical or cold, even toward people who mean well. Keep your clarity, but let some warmth back in, and notice when sharp words are protecting you more than they are serving the truth.",
    },
    reflection: "How can you speak your truth clearly while keeping your heart open?",
  },
  {
    id: "swords-14",
    name: "King of Swords",
    nameZh: "宝剑国王",
    arcana: "minor",
    suit: "swords",
    number: 14,
    element: "air",
    keywords: {
      upright: ["intellectual authority", "clear thinking", "integrity", "objectivity"],
      reversed: ["cold logic", "misused authority", "rigid thinking", "manipulation"],
    },
    meaning: {
      upright:
        "You may be called to approach a situation with clear reasoning, objectivity and integrity. Make decisions based on facts and principles, communicate them with calm authority, and hold yourself to the same standards you set for others.",
      reversed:
        "Logic may be turning cold or rigid, or authority, yours or someone else's, may be used to control rather than clarify. Check your reasoning for bias, and remember that fairness includes empathy for how decisions affect people.",
    },
    reflection: "Which principle do you want to guide this decision?",
  },

  // ---------------------------------------------------------------------------
  // Pentacles (earth)
  // ---------------------------------------------------------------------------
  {
    id: "pentacles-01",
    name: "Ace of Pentacles",
    nameZh: "星币王牌",
    arcana: "minor",
    suit: "pentacles",
    number: 1,
    element: "earth",
    keywords: {
      upright: ["new opportunity", "solid foundations", "prosperity", "practical beginnings"],
      reversed: ["missed chances", "poor planning", "shaky foundations", "delays"],
    },
    meaning: {
      upright:
        "A practical opportunity may be appearing in your work, resources or daily life, offering you a chance to build something lasting. Ground your intentions in a concrete plan and nurture this seed with patient, steady effort.",
      reversed:
        "An opportunity may feel slow to take root, or you may be hesitating to commit because the plan is not yet solid. Review the practical details, shore up your foundations, and favor lasting results over quick ones.",
    },
    reflection: "What small, practical step could plant a seed for long-term growth?",
  },
  {
    id: "pentacles-02",
    name: "Two of Pentacles",
    nameZh: "星币二",
    arcana: "minor",
    suit: "pentacles",
    number: 2,
    element: "earth",
    keywords: {
      upright: ["juggling priorities", "adaptability", "flexibility", "time management"],
      reversed: ["disorganization", "losing balance", "reprioritizing", "too many commitments"],
    },
    meaning: {
      upright:
        "You may be juggling several demands at once, keeping things moving through flexibility and good humor. Stay adaptable, prioritize what matters most each day, and remember that balance is an ongoing practice rather than a fixed state.",
      reversed:
        "You may have taken on more than you can comfortably manage, and something important could be slipping. Pause to reorganize, drop or delay what is not essential, and ask for help before the juggling becomes exhausting.",
    },
    reflection: "Which priority deserves more of your attention, and which can wait?",
  },
  {
    id: "pentacles-03",
    name: "Three of Pentacles",
    nameZh: "星币三",
    arcana: "minor",
    suit: "pentacles",
    number: 3,
    element: "earth",
    keywords: {
      upright: ["teamwork", "collaboration", "craftsmanship", "learning"],
      reversed: ["poor coordination", "mismatched goals", "working alone", "unclear roles"],
    },
    meaning: {
      upright:
        "You may benefit from collaboration, where your skills combine with others' expertise to create something better than any of you could alone. Value each contribution, ask for feedback, and take pride in careful, skilled work.",
      reversed:
        "Teamwork may be faltering through unclear roles, mismatched goals or reluctance to share credit. Clarify expectations, listen to different viewpoints, and consider whether you are trying to do everything yourself instead of collaborating.",
    },
    reflection: "Who could help you improve your work, and have you asked them?",
  },
  {
    id: "pentacles-04",
    name: "Four of Pentacles",
    nameZh: "星币四",
    arcana: "minor",
    suit: "pentacles",
    number: 4,
    element: "earth",
    keywords: {
      upright: ["security", "holding tight", "conservation", "control"],
      reversed: ["loosening grip", "generosity", "clinging", "carelessness"],
    },
    meaning: {
      upright:
        "You may be holding tightly to what you have, whether resources, routines or emotional control, in order to feel secure. Stability matters, but notice whether caution has become a grip that keeps growth and connection out.",
      reversed:
        "You may be loosening your grip on something you have guarded closely, or swinging between clinging and carelessness. Look for a healthier middle ground where security and generosity can exist side by side.",
    },
    reflection: "What are you holding onto out of fear rather than need?",
  },
  {
    id: "pentacles-05",
    name: "Five of Pentacles",
    nameZh: "星币五",
    arcana: "minor",
    suit: "pentacles",
    number: 5,
    element: "earth",
    keywords: {
      upright: ["hardship", "scarcity", "feeling excluded", "struggle"],
      reversed: ["accepting help", "gradual improvement", "renewed hope"],
    },
    meaning: {
      upright:
        "You may be going through a period of material or emotional hardship, feeling left out in the cold. Look for support that may be nearer than it seems, and remember that asking for help is a form of resourcefulness, not weakness.",
      reversed:
        "You may be finding your way out of a difficult stretch, or struggling to accept help that is being offered. Let others support you, and notice the small signs of improvement that are easy to miss when you feel depleted.",
    },
    reflection: "Where might support be available if you allowed yourself to ask?",
  },
  {
    id: "pentacles-06",
    name: "Six of Pentacles",
    nameZh: "星币六",
    arcana: "minor",
    suit: "pentacles",
    number: 6,
    element: "earth",
    keywords: {
      upright: ["generosity", "giving and receiving", "sharing resources", "reciprocity"],
      reversed: ["strings attached", "one-sided giving", "power imbalance"],
    },
    meaning: {
      upright:
        "You may be in a position to give or receive support, whether time, knowledge or resources. Let the exchange be fair and freely offered, and notice how generosity flows more easily when it comes without conditions.",
      reversed:
        "Giving and receiving may feel out of balance, with help coming with strings attached or one side always giving. Consider where you need to receive more, give more freely, or address an uneven power dynamic honestly.",
    },
    reflection: "Are you more comfortable giving or receiving, and why?",
  },
  {
    id: "pentacles-07",
    name: "Seven of Pentacles",
    nameZh: "星币七",
    arcana: "minor",
    suit: "pentacles",
    number: 7,
    element: "earth",
    keywords: {
      upright: ["patience", "long-term vision", "assessment", "steady cultivation"],
      reversed: ["impatience", "doubting progress", "misdirected effort", "restless waiting"],
    },
    meaning: {
      upright:
        "You may be at a point where you can pause and assess the results of sustained effort. Growth often takes longer than hoped, so review what is working, adjust where needed, and keep tending your long-term goals.",
      reversed:
        "You may feel impatient with slow results, or wonder whether your effort is going to the right place. Before abandoning the work, reassess your approach honestly and redirect energy toward what is genuinely growing.",
    },
    reflection: "What is quietly growing in your life that needs more patience?",
  },
  {
    id: "pentacles-08",
    name: "Eight of Pentacles",
    nameZh: "星币八",
    arcana: "minor",
    suit: "pentacles",
    number: 8,
    element: "earth",
    keywords: {
      upright: ["diligence", "skill building", "mastery", "dedication"],
      reversed: ["perfectionism", "disengagement", "lack of focus", "uninspired routine"],
    },
    meaning: {
      upright:
        "You may be in a season of focused learning and steady practice, refining your skills one detail at a time. Commit to the craft, take pride in the process, and trust that consistent effort tends to build real mastery.",
      reversed:
        "You may be stuck in perfectionism, or going through the motions without real engagement. Check whether your effort is aimed at the right skills, and allow yourself to improve steadily rather than flawlessly.",
    },
    reflection: "Which skill do you want to deepen through patient, regular practice?",
  },
  {
    id: "pentacles-09",
    name: "Nine of Pentacles",
    nameZh: "星币九",
    arcana: "minor",
    suit: "pentacles",
    number: 9,
    element: "earth",
    keywords: {
      upright: ["self-sufficiency", "earned comfort", "refinement", "independence"],
      reversed: ["overworking", "self-worth doubts", "hollow luxury"],
    },
    meaning: {
      upright:
        "You may be enjoying the rewards of discipline and self-reliance, appreciating the comfort you have built for yourself. Pause to honor this independence, and let yourself enjoy the security your consistent choices have helped create.",
      reversed:
        "You may be working so hard for security that you have little time to enjoy it, or measuring your worth by appearances. Reconnect with what genuinely makes you feel secure and content, independent of other people's opinions.",
    },
    reflection: "What have you built that you have not yet paused to enjoy?",
  },
  {
    id: "pentacles-10",
    name: "Ten of Pentacles",
    nameZh: "星币十",
    arcana: "minor",
    suit: "pentacles",
    number: 10,
    element: "earth",
    keywords: {
      upright: ["legacy", "long-term security", "family traditions", "lasting foundations"],
      reversed: ["family friction", "short-term thinking", "questioning legacy", "instability"],
    },
    meaning: {
      upright:
        "You may be focused on building something that lasts, such as family bonds, traditions or long-term security. Consider how today's choices shape what you pass on, and appreciate the support and wisdom you have inherited.",
      reversed:
        "Family expectations, shared resources or long-term plans may be causing tension or feeling unstable. Look at which traditions still serve you, and consider how to build security that reflects your own values rather than obligation.",
    },
    reflection: "What do you hope to pass on to those who come after you?",
  },
  {
    id: "pentacles-11",
    name: "Page of Pentacles",
    nameZh: "星币侍从",
    arcana: "minor",
    suit: "pentacles",
    number: 11,
    element: "earth",
    keywords: {
      upright: ["practical learning", "new skills", "studiousness", "grounded ambition"],
      reversed: ["procrastination", "distraction", "lack of follow-through", "unrealistic goals"],
    },
    meaning: {
      upright:
        "You may feel eager to learn something practical or turn an idea into a workable plan. Approach it like a dedicated student, setting realistic goals and taking steady steps, and let curiosity keep you engaged.",
      reversed:
        "You may be dreaming about goals without taking concrete steps, or losing focus before a project has a chance to grow. Choose one manageable task, commit to it consistently, and let small, visible progress rebuild your motivation.",
    },
    reflection: "What practical skill would you like to begin learning this month?",
  },
  {
    id: "pentacles-12",
    name: "Knight of Pentacles",
    nameZh: "星币骑士",
    arcana: "minor",
    suit: "pentacles",
    number: 12,
    element: "earth",
    keywords: {
      upright: ["reliability", "methodical effort", "routine", "commitment"],
      reversed: ["boredom", "inertia", "overcaution", "stubbornness"],
    },
    meaning: {
      upright:
        "You may make the most progress now through patience, reliability and methodical effort rather than dramatic moves. Keep showing up, follow through on your commitments, and let steady routines carry your goals forward.",
      reversed:
        "Your steadiness may have turned into stubbornness, boredom or excessive caution, leaving progress stalled. Consider whether your routine still serves your goals, and introduce a small change that brings fresh energy without losing reliability.",
    },
    reflection: "What steady habit could move your most important goal forward?",
  },
  {
    id: "pentacles-13",
    name: "Queen of Pentacles",
    nameZh: "星币王后",
    arcana: "minor",
    suit: "pentacles",
    number: 13,
    element: "earth",
    keywords: {
      upright: ["practical care", "groundedness", "resourcefulness", "warm hospitality"],
      reversed: ["work-life imbalance", "neglected needs", "carrying everything"],
    },
    meaning: {
      upright:
        "You may be combining warmth with practicality, caring for others while keeping daily life running smoothly. Create a comfortable, welcoming space, and remember that tending to your own needs belongs within that circle of care.",
      reversed:
        "You may be so busy caring for others or managing practical matters that your own well-being slips. Look for ways to restore balance between work and home, and let others share the load of daily responsibilities.",
    },
    reflection: "How can you make your everyday life feel more nourishing?",
  },
  {
    id: "pentacles-14",
    name: "King of Pentacles",
    nameZh: "星币国王",
    arcana: "minor",
    suit: "pentacles",
    number: 14,
    element: "earth",
    keywords: {
      upright: ["stability", "steady leadership", "discipline", "abundance"],
      reversed: ["materialism", "status seeking", "rigidity", "possessive control"],
    },
    meaning: {
      upright:
        "Your experience, discipline and practical wisdom may now allow you to lead with quiet steadiness. Use your resources thoughtfully, provide security for yourself and others, and measure success by the stability and care you create.",
      reversed:
        "You may be focusing so heavily on status, control or material security that other parts of life feel neglected. Consider whether your ambitions still serve your values, and remember that true security includes relationships and rest.",
    },
    reflection: "What does true security mean to you beyond material comfort?",
  },
];
