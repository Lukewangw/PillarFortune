import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  LogOut,
  Star,
  Sparkles,
} from "lucide-react";

const MysticFortune = () => {
  const [activeTab, setActiveTab] = useState("fourPillars");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stars, setStars] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    birthDate: "",
    birthTime: "",
    gender: "",
    birthCity: "",
    currentCity: "",
  });

  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });

  const [baziChart, setBaziChart] = useState(null);

  // Generate stars on mount
  useEffect(() => {
    const generateStars = () => {
      const newStars = [];
      for (let i = 0; i < 150; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 2 + 0.5,
          animationDelay: Math.random() * 5,
        });
      }
      setStars(newStars);
    };
    generateStars();
  }, []);

  // BaZi calculation data
  const heavenlyStems = [
    { name: "甲", element: "Wood", yin: false, emoji: "🌳" },
    { name: "乙", element: "Wood", yin: true, emoji: "🌿" },
    { name: "丙", element: "Fire", yin: false, emoji: "🔥" },
    { name: "丁", element: "Fire", yin: true, emoji: "🕯️" },
    { name: "戊", element: "Earth", yin: false, emoji: "⛰️" },
    { name: "己", element: "Earth", yin: true, emoji: "🏜️" },
    { name: "庚", element: "Metal", yin: false, emoji: "⚔️" },
    { name: "辛", element: "Metal", yin: true, emoji: "💍" },
    { name: "壬", element: "Water", yin: false, emoji: "🌊" },
    { name: "癸", element: "Water", yin: true, emoji: "💧" },
  ];

  const earthlyBranches = [
    { name: "子", animal: "Rat", element: "Water", emoji: "🐀" },
    { name: "丑", animal: "Ox", element: "Earth", emoji: "🐂" },
    { name: "寅", animal: "Tiger", element: "Wood", emoji: "🐅" },
    { name: "卯", animal: "Rabbit", element: "Wood", emoji: "🐇" },
    { name: "辰", animal: "Dragon", element: "Earth", emoji: "🐉" },
    { name: "巳", animal: "Snake", element: "Fire", emoji: "🐍" },
    { name: "午", animal: "Horse", element: "Fire", emoji: "🐎" },
    { name: "未", animal: "Goat", element: "Earth", emoji: "🐐" },
    { name: "申", animal: "Monkey", element: "Metal", emoji: "🐒" },
    { name: "酉", animal: "Rooster", element: "Metal", emoji: "🐓" },
    { name: "戌", animal: "Dog", element: "Earth", emoji: "🐕" },
    { name: "亥", animal: "Pig", element: "Water", emoji: "🐖" },
  ];

  // Fortune telling content database (keeping the rich content from previous version)
  const fortuneDatabase = {
    career: {
      Wood: {
        strong: [
          "Your creative energy is at its peak this year. New opportunities in innovation and growth sectors await you. Your natural leadership abilities will shine, especially in projects that require vision and pioneering spirit. The wooden energy within you resonates with expansion and development. Consider roles that allow you to nurture and guide others - teaching, consulting, or creative direction align perfectly with your elemental nature. This period marks a significant turning point where your ideas take root and flourish into tangible success.",
          "The seeds you've planted in previous cycles now burst forth with vibrant growth. Your ability to see the big picture while nurturing individual details sets you apart from competitors. Collaboration with Fire-element colleagues will accelerate your progress, as they help transform your visions into passionate action. Earth-element partnerships provide the stability needed for sustainable expansion.",
        ],
        weak: [
          "This period calls for patience in your professional life. Focus on building strong foundations rather than rapid expansion. Collaboration with Metal-element colleagues will bring unexpected breakthroughs. Your career path may feel slower than desired, but this is a time for deep roots to form. Seek mentorship from established professionals, particularly those born in Earth years. The universe is preparing you for future growth by strengthening your core. What seems like stagnation is actually a period of internal development that will support massive expansion in coming cycles.",
          "Flexibility in your career approach will open new doors. Consider creative or people-oriented roles that balance your natural inclination toward structure. Water-element influences bring flow to your work, helping you navigate obstacles with grace. This is not a time for forcing growth but for allowing organic development to unfold naturally.",
        ],
      },
      Fire: {
        strong: [
          "Your passionate nature attracts success like a magnet. Leadership positions and public-facing roles will bring recognition. The spotlight seeks you out - embrace it with confidence. Dynamic energy surrounds your professional endeavors. Marketing, entertainment, or any field requiring charisma and enthusiasm will yield exceptional results. Your ability to inspire others reaches new heights this cycle. Teams rally around your vision, and superiors recognize your unique ability to motivate and drive results. The fire within you burns bright, illuminating pathways previously hidden in shadow.",
          "This is your time to shine brilliantly in your chosen field. Your natural warmth draws opportunities and allies alike. Creative projects flourish under your passionate guidance. Risk-taking is favored now - trust your instincts when bold moves present themselves. The universe rewards your courage with unexpected breakthroughs.",
        ],
        weak: [
          "Your professional fire needs rekindling. Seek inspiration through learning new skills or exploring different industries. Water-element partners can help balance your energy, preventing burnout while maintaining momentum. This temporary dimming of your flame serves a purpose - it allows you to conserve energy for the explosive growth coming in future cycles. Focus on sustainable practices rather than burning bright and fast.",
          "Strategic retreat and planning characterize this period. Use this quieter time to develop new skills and strengthen existing foundations. Your natural enthusiasm may feel dampened, but this is the universe's way of teaching you patience and strategic thinking.",
        ],
      },
      Earth: {
        strong: [
          "Stability and reliability are your superpowers. Real estate, finance, or resource management fields will prosper under your guidance. Your practical wisdom commands respect. This is an excellent period for long-term investments in your career. Your grounded approach attracts trustworthy partners and lucrative opportunities. The earth element within you provides unshakeable foundation for others to build upon. Your patience and methodical approach yield compound returns over time. While others chase quick wins, you build empires that last generations.",
          "Your reputation for dependability opens doors to positions of significant responsibility. Trust is your currency, and it's accumulating rapidly. Conservative strategies yield surprising profits as your steady hand guides projects through turbulent times.",
        ],
        weak: [
          "Professional growth requires stepping out of your comfort zone. Embrace change and innovation, particularly in technology or creative fields. Fire-element mentors can ignite your ambition, showing you that stability and growth aren't mutually exclusive. This period challenges your natural conservatism, pushing you toward calculated risks that ultimately strengthen your position. The discomfort you feel is the sensation of growth - lean into it rather than resisting.",
          "Adaptation is your lesson this cycle. The solid ground you're accustomed to may shift, requiring you to develop new skills in navigation. Water and Wood elements offer guidance in flexibility and growth respectively.",
        ],
      },
      Metal: {
        strong: [
          "Precision and excellence define your work. Technical fields, luxury goods, or quality-focused industries will reward your attention to detail. Your standards set you apart from competitors. Your analytical mind cuts through complexity with ease. Finance, technology, or strategic planning roles will showcase your natural talents. The metal element within you seeks perfection, and this cycle supports your exacting standards. Your ability to refine and improve existing systems makes you invaluable. While others see problems, you see opportunities for optimization.",
          "This period favors specialization over generalization. Deep expertise in your chosen field yields exceptional rewards. Your reputation for quality attracts premium clients willing to pay for excellence. Partnerships with Earth-element individuals provide the stable platform from which to launch your precise strategies.",
        ],
        weak: [
          "Flexibility in your career approach will open new doors. Consider creative or people-oriented roles that balance your natural inclination toward structure. Water-element influences bring flow to your work, helping you navigate around obstacles rather than trying to cut through them. This cycle teaches you that perfection isn't always necessary - sometimes 'good enough' allows for progress where perfectionism creates paralysis. Learn to release control and trust in collaborative processes.",
          "Your exacting standards may need tempering with compassion and flexibility. Wood-element colleagues show you how growth sometimes requires bending rather than breaking. This period of softening ultimately makes you stronger and more versatile.",
        ],
      },
      Water: {
        strong: [
          "Your adaptability is your greatest asset. Communication, networking, and international business ventures flow naturally to you. Your intuition guides you to hidden opportunities. Fluid intelligence and emotional wisdom position you perfectly for counseling, negotiation, or artistic pursuits. Trust your instincts in career decisions. The water element within you finds the path of least resistance to maximum success. Your ability to read people and situations gives you a strategic advantage. While others force their way forward, you flow around obstacles effortlessly.",
          "This cycle amplifies your natural intuitive abilities. Trust the subtle feelings that guide your professional choices. Your emotional intelligence opens doors that remain closed to those who rely solely on logic. International opportunities particularly favor you now.",
        ],
        weak: [
          "Career momentum needs structure and direction. Partnering with Earth-element colleagues provides stability. Set clear goals and create systems to channel your creative flow. Without structure, your talents may dissipate like mist. This period requires you to contain your flowing nature within defined channels, creating focused power rather than dispersed potential. Metal-element influences help you develop necessary discipline while maintaining your natural fluidity.",
          "Define clear boundaries in professional relationships. Your empathetic nature, while valuable, needs protection from those who would take advantage. This cycle teaches discernment in choosing where to direct your emotional and creative energies.",
        ],
      },
    },
    love: {
      general: [
        "Your heart seeks both excitement and stability, a delicate balance that defines your romantic journey. Past experiences have taught you valuable lessons about vulnerability and trust. The cosmic energies surrounding you now create perfect conditions for deep, meaningful connections. Whether you're single or partnered, this cycle brings opportunities for profound emotional growth. Love isn't just about finding the right person - it's about becoming the right person. The universe is preparing you for a love that transcends ordinary romance.",
        "Love enters your life in unexpected ways this cycle. Pay attention to chance encounters and seemingly random connections - the universe orchestrates meetings in mysterious ways. Your romantic energy attracts partners who mirror your own growth journey. The relationships you form now serve as catalysts for personal transformation. Old patterns that no longer serve you fall away, making room for healthier dynamics. Trust the timing of your love life - what's meant for you will not pass you by.",
        "Your romantic energy undergoes a beautiful transformation this period. Past wounds heal, allowing you to approach love with renewed openness. The universe conspires to bring you exactly what you need for your soul's evolution. This may not always be what you want, but it will always be what serves your highest good. Patience in matters of the heart yields the sweetest rewards.",
        "Emotional wisdom gained through past challenges now guides you toward healthier connections. You recognize red flags earlier and appreciate green flags more deeply. Your standards aren't too high - they're finally high enough. The love approaching you matches the love you've cultivated within yourself. Self-love isn't selfish; it's the foundation upon which lasting partnership builds.",
      ],
      compatibility: {
        Wood: "Water and Fire elements bring passion and nourishment to your relationships. Water feeds your growth while Fire transforms your potential into realized love.",
        Fire: "Wood and Earth elements provide fuel and grounding for lasting love. Wood feeds your passion while Earth contains it in stable commitment.",
        Earth:
          "Fire and Metal elements add warmth and refinement to partnerships. Fire brings passion to your stability while Metal adds lasting value.",
        Metal:
          "Earth and Water elements offer support and emotional depth. Earth provides the foundation while Water adds emotional fluidity.",
        Water:
          "Metal and Wood elements bring structure and growth to your love life. Metal gives form to your feelings while Wood ensures continuous growth.",
      },
    },
    health: {
      Wood: "Focus on liver health and stress management. Green foods and morning exercise strengthen your elemental balance. Eye strain may occur during intense work periods - practice the 20-20-20 rule. Your wood element thrives with movement and flexibility. Yoga, tai chi, or dance particularly benefit your constitution. Seasonal allergies may flare during spring - prepare with natural remedies. Emotional health directly impacts your physical wellbeing; unresolved anger or frustration manifests as physical tension. Regular meditation helps maintain equilibrium. Fresh air and nature connection are essential for your vitality.",
      Fire: "Heart health and circulation deserve attention. Cooling foods and meditation balance your fiery nature. Summer months require extra hydration and rest. Your passionate nature can lead to burnout if not properly managed. Create rituals for releasing excess energy - vigorous exercise followed by calming practices. Your digestion runs hot; avoid excessive spicy foods despite your attraction to them. Sleep quality impacts your overall health more than other elements - prioritize consistent rest patterns. Joy is your medicine; activities that spark genuine happiness boost your immune system.",
      Earth:
        "Digestive health is your foundation. Regular meal times and mindful eating support your constitution. Worry can affect your stomach - practice grounding exercises. Your earth element requires routine and stability for optimal health. Sudden changes in diet or lifestyle impact you more severely than others. Build health habits slowly but consistently. Your body holds onto both nutrients and toxins longer than other elements - choose quality over quantity in all consumption. Barefoot walking and gardening provide therapeutic benefits unique to your constitution.",
      Metal:
        "Respiratory health and skin care need focus. Deep breathing exercises and adequate hydration support your element. Autumn transitions require extra immune support. Your metal element makes you more susceptible to grief affecting physical health - process emotions fully rather than suppressing them. Dry conditions affect you more than others; use humidifiers and moisturizers liberally. Your perfectionist nature can create tension - regular massage or acupuncture helps release stored stress. White and light-colored foods particularly nourish your constitution.",
      Water:
        "Kidney health and bone strength are priorities. Warm foods and gentle exercise maintain your vitality. Cold weather demands extra self-care and rest. Your water element requires more sleep than other elements - honor this need without judgment. Fear depletes your energy reserves quickly; courage-building activities restore balance. Your intuitive nature means you often absorb others' emotions - regular energy cleansing is essential. Mineral-rich foods and adequate salt intake support your unique constitution. Swimming or water-based activities provide exceptional therapeutic benefits.",
    },
    wealth: {
      messages: [
        "Financial abundance flows through multiple streams this year. Your main income remains stable while unexpected bonuses arrive through creative ventures or investments. The universe rewards your past generosity with compound interest. A significant opportunity emerges through your network - someone you helped before returns the favor tenfold. Trust your instincts when unusual investment opportunities present themselves. Your relationship with money transforms from scarcity to abundance mindset.",
        "A significant financial opportunity emerges through your network. Someone you've helped in the past returns the favor with valuable information or partnership offer. This cycle breaks old patterns of financial struggle. What seemed impossible becomes achievable through strategic planning and divine timing. Your wealth grows not just in monetary terms but in valuable connections and knowledge. The seeds of prosperity you plant now will feed generations.",
        "Your relationship with money transforms this cycle. Old patterns of scarcity thinking dissolve as you embrace abundance mindset and smart financial planning. The universe tests your generosity - what you give returns multiplied. Unexpected windfalls arrive just when needed. Your intuition about financial matters sharpens considerably. Trust the subtle nudges guiding your monetary decisions.",
        "Investment in personal development yields surprising financial returns. Skills acquired now become income sources within 6-8 months. Your unique talents finally receive proper monetary recognition. Multiple passive income streams begin to flow. The financial foundation you build now supports your dreams for decades to come. Wealth arrives not as a single windfall but as steady, increasing flow.",
        "Collaborative ventures prove more profitable than solo efforts. Consider partnerships that combine complementary skills and resources. Your network is your net worth this cycle. Introductions made now lead to lucrative opportunities later. Share your knowledge freely - teaching others attracts abundance. The universe rewards those who help others prosper.",
      ],
    },
    personality: {
      traits: {
        Wood: [
          "Creative",
          "Visionary",
          "Generous",
          "Growth-oriented",
          "Flexible",
          "Compassionate",
        ],
        Fire: [
          "Passionate",
          "Dynamic",
          "Inspiring",
          "Optimistic",
          "Charismatic",
          "Adventurous",
        ],
        Earth: [
          "Reliable",
          "Practical",
          "Nurturing",
          "Patient",
          "Trustworthy",
          "Grounded",
        ],
        Metal: [
          "Precise",
          "Disciplined",
          "Refined",
          "Determined",
          "Organized",
          "Principled",
        ],
        Water: [
          "Intuitive",
          "Adaptable",
          "Wise",
          "Diplomatic",
          "Mysterious",
          "Flowing",
        ],
      },
    },
  };

  // Barnum effect statements for added personalization
  const barnumStatements = {
    opening: [
      "You have a great need for other people to like and admire you, yet you tend to be critical of yourself.",
      "While you have some personality weaknesses, you are generally able to compensate for them.",
      "You have considerable unused capacity that you have not turned to your advantage.",
      "Disciplined and self-controlled on the outside, you tend to be worrisome and insecure inside.",
    ],
    middle: [
      "At times you have serious doubts about whether you have made the right decision or done the right thing.",
      "You prefer a certain amount of change and variety and become dissatisfied when hemmed in by restrictions.",
      "You pride yourself as an independent thinker and do not accept others' statements without satisfactory proof.",
      "You have found it unwise to be too frank in revealing yourself to others.",
    ],
    closing: [
      "Sometimes you are extroverted, affable, and sociable, while at other times you are introverted, wary, and reserved.",
      "Some of your aspirations tend to be pretty unrealistic, but you have learned to balance dreams with practicality.",
      "Security is one of your major goals in life, yet you also crave excitement and new experiences.",
    ],
  };

  const calculateBaZi = () => {
    if (!formData.birthDate || !formData.birthTime) return null;

    const date = new Date(formData.birthDate + "T" + formData.birthTime);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hour = date.getHours();

    return {
      year: {
        stem: heavenlyStems[(year - 4) % 10],
        branch: earthlyBranches[(year - 4) % 12],
      },
      month: {
        stem: heavenlyStems[(month + 2) % 10],
        branch: earthlyBranches[(month + 2) % 12],
      },
      day: {
        stem: heavenlyStems[(day + 5) % 10],
        branch: earthlyBranches[day % 12],
      },
      hour: {
        stem: heavenlyStems[hour % 10],
        branch: earthlyBranches[Math.floor(hour / 2) % 12],
      },
      dayMaster: heavenlyStems[(day + 5) % 10],
    };
  };

  const handleLogin = () => {
    if (authData.email && authData.password) {
      setCurrentUser({ email: authData.email, name: authData.name || "User" });
      setIsAuthenticated(true);
      setShowAuthModal(false);
    }
  };

  const handleRegister = () => {
    if (
      authData.email &&
      authData.password &&
      authData.password === authData.confirmPassword
    ) {
      setCurrentUser({ email: authData.email, name: authData.name });
      setIsAuthenticated(true);
      setShowAuthModal(false);
    }
  };

  const handleGuestLogin = () => {
    setCurrentUser({ name: "Guest", isGuest: true });
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowAuthModal(true);
    setShowResults(false);
  };

  const handleDivineDestiny = () => {
    if (!formData.birthDate || !formData.birthTime || !formData.birthCity) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const chart = calculateBaZi();
      setBaziChart(chart);
      setShowResults(true);
      setLoading(false);
    }, 2000);
  };

  const generateFortune = () => {
    if (!baziChart) return null;

    const element = baziChart.dayMaster.element;
    const isStrong = Math.random() > 0.5;

    // Get detailed fortune for the element
    const careerFortune =
      fortuneDatabase.career[element][isStrong ? "strong" : "weak"];
    const loveMessage =
      fortuneDatabase.love.general[
        Math.floor(Math.random() * fortuneDatabase.love.general.length)
      ];
    const healthMessage = fortuneDatabase.health[element];
    const wealthMessage =
      fortuneDatabase.wealth.messages[
        Math.floor(Math.random() * fortuneDatabase.wealth.messages.length)
      ];

    return {
      career: careerFortune[Math.floor(Math.random() * careerFortune.length)],
      love: loveMessage,
      health: healthMessage,
      wealth: wealthMessage,
      barnum:
        barnumStatements.opening[
          Math.floor(Math.random() * barnumStatements.opening.length)
        ],
    };
  };

  // Auth Modal Component - Fixed with memoization and stable references
  const AuthModal = React.memo(() => {
    // Local state for auth modal to prevent re-renders
    const [localAuthData, setLocalAuthData] = useState({
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
    });

    const handleLocalLogin = () => {
      if (localAuthData.email && localAuthData.password) {
        setCurrentUser({ email: localAuthData.email, name: "User" });
        setIsAuthenticated(true);
        setShowAuthModal(false);
      }
    };

    const handleLocalRegister = () => {
      if (
        localAuthData.email &&
        localAuthData.password &&
        localAuthData.password === localAuthData.confirmPassword
      ) {
        setCurrentUser({
          email: localAuthData.email,
          name: localAuthData.name,
        });
        setIsAuthenticated(true);
        setShowAuthModal(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-b from-purple-900/90 to-indigo-900/90 rounded-3xl p-8 max-w-md w-full border border-purple-500/20 shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-amber-400 to-pink-400 bg-clip-text text-transparent">
            MYSTIC FORTUNE
          </h2>
          <p className="text-gray-300 text-center mb-6">
            Ancient Wisdom · Modern Insights
          </p>

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 rounded-full transition-all ${
                authMode === "login"
                  ? "bg-gradient-to-r from-amber-500 to-pink-500 text-white"
                  : "bg-white/10 text-gray-300"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`flex-1 py-2 rounded-full transition-all ${
                authMode === "register"
                  ? "bg-gradient-to-r from-amber-500 to-pink-500 text-white"
                  : "bg-white/10 text-gray-300"
              }`}
            >
              Register
            </button>
          </div>

          {authMode === "login" ? (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                value={localAuthData.email}
                onChange={(e) =>
                  setLocalAuthData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                autoFocus
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                value={localAuthData.password}
                onChange={(e) =>
                  setLocalAuthData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
              />
              <button
                type="button"
                onClick={handleLocalLogin}
                className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                Enter the Cosmos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                value={localAuthData.name}
                onChange={(e) =>
                  setLocalAuthData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                autoFocus
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                value={localAuthData.email}
                onChange={(e) =>
                  setLocalAuthData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                value={localAuthData.password}
                onChange={(e) =>
                  setLocalAuthData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
              />
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                value={localAuthData.confirmPassword}
                onChange={(e) =>
                  setLocalAuthData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
              <button
                type="button"
                onClick={handleLocalRegister}
                className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                Create Account
              </button>
            </div>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-b from-purple-900 to-indigo-900 text-gray-400">
                OR
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full py-3 rounded-full bg-white/10 text-gray-300 font-semibold hover:bg-white/20 transition-all border border-purple-500/30"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    );
  });

  // Results Component
  const ResultsSection = () => {
    if (!baziChart) return null;

    const fortune = generateFortune();
    const element = baziChart.dayMaster.element;
    const traits = fortuneDatabase.personality.traits[element];

    return (
      <div className="mt-12 space-y-8 animate-fadeIn">
        {/* Four Pillars Chart */}
        <div className="bg-gradient-to-b from-purple-900/20 to-purple-900/10 rounded-3xl p-8 border border-purple-500/20">
          <h3 className="text-2xl font-bold text-center mb-8 text-amber-400">
            Your Four Pillars Chart
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {["year", "month", "day", "hour"].map((pillar) => (
              <div key={pillar} className="text-center">
                <div className="text-amber-400 font-semibold mb-3 text-lg">
                  {pillar.charAt(0).toUpperCase() + pillar.slice(1)} Pillar
                </div>
                <div className="bg-purple-900/30 rounded-2xl p-6 border border-purple-500/30 backdrop-blur-sm">
                  <div className="text-4xl mb-2">
                    {baziChart[pillar].stem.emoji}
                  </div>
                  <div className="text-gray-400 text-sm mb-4">
                    {baziChart[pillar].stem.element}{" "}
                    {baziChart[pillar].stem.name}
                  </div>
                  <div className="text-4xl mb-2">
                    {baziChart[pillar].branch.emoji}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {baziChart[pillar].branch.animal}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 p-6 bg-purple-900/20 rounded-2xl">
            <h4 className="text-xl text-gray-300 mb-2">
              Your Day Master: {baziChart.dayMaster.emoji}{" "}
              {baziChart.dayMaster.element} Element
            </h4>
            <p className="text-gray-400">
              Core Element: {baziChart.dayMaster.name} - The essence of your
              being
            </p>
          </div>
        </div>

        {/* Destiny Reading */}
        <div className="bg-gradient-to-b from-purple-900/20 to-purple-900/10 rounded-3xl p-8 border border-purple-500/20">
          <h3 className="text-3xl font-bold text-center mb-6 text-amber-400">
            Your Destiny Reading
          </h3>
          <div className="text-center space-y-6">
            <div className="text-5xl">{baziChart.dayMaster.emoji}</div>
            <div className="text-xl text-amber-400">
              Day Master: {baziChart.dayMaster.element} Element
            </div>
            <p className="text-gray-300 leading-relaxed max-w-3xl mx-auto text-lg">
              {fortune.career.split(".")[0]}.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              {traits.map((trait) => (
                <span
                  key={trait}
                  className="px-5 py-2 bg-purple-800/30 rounded-full text-purple-300 border border-purple-500/30"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Life Aspects - Full Width Cards */}
        <div className="space-y-6">
          {/* Career Card */}
          <div className="bg-gradient-to-b from-purple-900/20 to-purple-900/10 rounded-3xl p-8 border border-purple-500/20">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">💼</span>
              <h4 className="text-2xl font-bold text-amber-400">Career</h4>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4 text-base">
              {fortune.career}
            </p>
            <div className="w-full bg-purple-900/30 rounded-full h-3 mt-6">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-amber-500 via-pink-500 to-green-500 transition-all duration-1000"
                style={{ width: `${75 + Math.random() * 20}%` }}
              />
            </div>
          </div>

          {/* Love Card */}
          <div className="bg-gradient-to-b from-purple-900/20 to-purple-900/10 rounded-3xl p-8 border border-purple-500/20">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">💕</span>
              <h4 className="text-2xl font-bold text-amber-400">Love</h4>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4 text-base">
              {fortune.love}
            </p>
            <div className="w-full bg-purple-900/30 rounded-full h-3 mt-6">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500 transition-all duration-1000"
                style={{ width: `${65 + Math.random() * 25}%` }}
              />
            </div>
          </div>

          {/* Wealth Card */}
          <div className="bg-gradient-to-b from-purple-900/20 to-purple-900/10 rounded-3xl p-8 border border-purple-500/20">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">💰</span>
              <h4 className="text-2xl font-bold text-amber-400">Wealth</h4>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4 text-base">
              {fortune.wealth}
            </p>
            <div className="w-full bg-purple-900/30 rounded-full h-3 mt-6">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 transition-all duration-1000"
                style={{ width: `${70 + Math.random() * 20}%` }}
              />
            </div>
          </div>

          {/* Health Card */}
          <div className="bg-gradient-to-b from-purple-900/20 to-purple-900/10 rounded-3xl p-8 border border-purple-500/20">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">🌿</span>
              <h4 className="text-2xl font-bold text-amber-400">Health</h4>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4 text-base">
              {fortune.health}
            </p>
            <div className="w-full bg-purple-900/30 rounded-full h-3 mt-6">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 transition-all duration-1000"
                style={{ width: `${80 + Math.random() * 15}%` }}
              />
            </div>
          </div>
        </div>

        {/* Additional Fortune Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-b from-purple-900/20 to-purple-900/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⭐</span>
              <h4 className="text-lg font-semibold text-amber-400">
                Lucky Elements
              </h4>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              Best Compatibility: {fortuneDatabase.love.compatibility[element]}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Lucky Numbers: {Math.floor(Math.random() * 9) + 1},{" "}
              {Math.floor(Math.random() * 9) + 10},{" "}
              {Math.floor(Math.random() * 9) + 20}
            </p>
          </div>

          <div className="bg-gradient-to-b from-purple-900/20 to-purple-900/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🔮</span>
              <h4 className="text-lg font-semibold text-amber-400">
                Cosmic Insight
              </h4>
            </div>
            <p className="text-gray-300 text-sm italic">{fortune.barnum}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-black relative overflow-hidden">
      {/* Animated Stars Background */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.animationDelay}s`,
              opacity: Math.random() * 0.8 + 0.2,
            }}
          />
        ))}
      </div>

      {/* Auth Modal */}
      {showAuthModal && !isAuthenticated && <AuthModal />}

      {/* Header */}
      <div className="relative z-10">
        <div className="flex justify-between items-center p-6">
          <div className="text-white/80 text-sm">
            {isAuthenticated && currentUser && `Welcome, ${currentUser.name}`}
          </div>
          <div className="flex gap-3">
            {isAuthenticated ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {currentUser?.name?.[0]?.toUpperCase() || "G"}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleGuestLogin}
                  className="px-6 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  Guest
                </button>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              MYSTIC FORTUNE
            </h1>
            <p className="text-gray-400 text-lg">
              Ancient Wisdom · Modern Insights
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-12">
            <button
              onClick={() => setActiveTab("fourPillars")}
              className={`px-8 py-3 rounded-full transition-all ${
                activeTab === "fourPillars"
                  ? "bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-lg shadow-amber-500/25"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              Four Pillars of Destiny
            </button>
            <button
              onClick={() => setActiveTab("tarot")}
              className={`px-8 py-3 rounded-full transition-all ${
                activeTab === "tarot"
                  ? "bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-lg shadow-amber-500/25"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              Tarot Reading
            </button>
          </div>

          {activeTab === "fourPillars" ? (
            <>
              {/* BaZi Form */}
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-8 text-amber-400">
                  Calculate Your BaZi Chart
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">
                      Birth Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                      <input
                        type="date"
                        className="w-full px-12 py-4 rounded-2xl bg-white/5 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400 transition-all"
                        value={formData.birthDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            birthDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">
                      Birth Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                      <input
                        type="time"
                        className="w-full px-12 py-4 rounded-2xl bg-white/5 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400 transition-all"
                        value={formData.birthTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            birthTime: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">
                      Gender
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                      <select
                        className="w-full px-12 py-4 rounded-2xl bg-white/5 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400 transition-all appearance-none"
                        value={formData.gender}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                      >
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">
                      Birth City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="e.g., New York"
                        className="w-full px-12 py-4 rounded-2xl bg-white/5 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-all"
                        value={formData.birthCity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            birthCity: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">
                      Current City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="e.g., San Francisco"
                        className="w-full px-12 py-4 rounded-2xl bg-white/5 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-all"
                        value={formData.currentCity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            currentCity: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleDivineDestiny}
                    className="px-12 py-4 rounded-full bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500 text-white font-bold text-lg hover:shadow-xl hover:shadow-amber-500/30 transition-all transform hover:scale-105"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 animate-spin" />
                        <span>Divining...</span>
                      </div>
                    ) : (
                      "Divine My Destiny"
                    )}
                  </button>
                </div>
              </div>

              {/* Results */}
              {showResults && <ResultsSection />}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔮</div>
              <h3 className="text-2xl text-amber-400 mb-4">Tarot Reading</h3>
              <p className="text-gray-400">
                Coming soon... The cards are being shuffled by cosmic forces.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MysticFortune;
