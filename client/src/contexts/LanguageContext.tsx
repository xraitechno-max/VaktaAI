import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.features': { en: 'Features', hi: 'विशेषताएं' },
  'nav.howItWorks': { en: 'How it Works', hi: 'यह कैसे काम करता है' },
  'nav.pricing': { en: 'Pricing', hi: 'मूल्य' },
  'nav.login': { en: 'Login', hi: 'लॉगिन' },
  'nav.startFree': { en: 'Start Learning Free', hi: 'मुफ्त में सीखें' },
  'nav.aiMentor': { en: 'AI Mentor', hi: 'AI मेंटर' },
  'nav.docSathi': { en: 'DocSathi', hi: 'डॉकसाथी' },
  'nav.quiz': { en: 'Quiz', hi: 'क्विज़' },
  'nav.studyPlan': { en: 'Study Plan', hi: 'स्टडी प्लान' },
  'nav.notes': { en: 'Notes', hi: 'नोट्स' },
  'nav.settings': { en: 'Settings', hi: 'सेटिंग्स' },
  
  // Sidebar
  'sidebar.tagline': { en: 'Your Study Companion', hi: 'आपका स्टडी साथी' },
  'sidebar.quickStart': { en: 'Quick Start', hi: 'क्विक स्टार्ट' },
  'sidebar.quickStartDesc': { en: 'Jump straight into learning', hi: 'सीधे पढ़ाई में कूद जाओ' },
  'sidebar.startChat': { en: 'Start Chat', hi: 'चैट शुरू करें' },
  'sidebar.learning': { en: 'Learning', hi: 'पढ़ाई' },
  'sidebar.preferences': { en: 'Preferences', hi: 'पसंद' },

  // Hero Section
  'hero.badge': { en: 'AI-Powered Learning Platform', hi: 'AI-संचालित शिक्षण मंच' },
  'hero.title1': { en: 'Got Doubts?', hi: 'कोई सवाल है?' },
  'hero.title2': { en: 'Ask Your AI Mentor', hi: 'अपने AI मेंटर से पूछो' },
  'hero.subtitle': { en: 'Learn Physics, Chemistry, Maths & Biology with personalized AI tutors. Available 24/7 for Class 6-12, JEE & NEET preparation.', hi: 'व्यक्तिगत AI ट्यूटर्स के साथ फिजिक्स, केमिस्ट्री, मैथ्स और बायोलॉजी सीखें। कक्षा 6-12, JEE और NEET की तैयारी के लिए 24/7 उपलब्ध।' },
  'hero.cta': { en: 'Start Learning Free', hi: 'मुफ्त में सीखना शुरू करें' },
  'hero.watchDemo': { en: 'Watch Demo', hi: 'डेमो देखें' },
  'hero.stats.students': { en: 'Students', hi: 'छात्र' },
  'hero.stats.rating': { en: 'Rating', hi: 'रेटिंग' },
  'hero.stats.available': { en: 'Available', hi: 'उपलब्ध' },

  // Exam Categories
  'exams.title': { en: 'Prepare for Any Exam', hi: 'किसी भी परीक्षा की तैयारी करें' },
  'exams.jee': { en: 'JEE Main & Advanced', hi: 'JEE मेन और एडवांस्ड' },
  'exams.neet': { en: 'NEET UG', hi: 'NEET UG' },
  'exams.cbse': { en: 'CBSE Board', hi: 'CBSE बोर्ड' },
  'exams.icse': { en: 'ICSE Board', hi: 'ICSE बोर्ड' },
  'exams.state': { en: 'State Boards', hi: 'राज्य बोर्ड' },

  // Mentors
  'mentors.title': { en: 'Meet Your AI Mentors', hi: 'अपने AI मेंटर्स से मिलें' },
  'mentors.subtitle': { en: 'Expert teachers available 24/7 to solve your doubts', hi: 'आपके सवालों को हल करने के लिए 24/7 उपलब्ध विशेषज्ञ शिक्षक' },
  'mentors.garima.name': { en: 'Garima Ma\'am', hi: 'गरिमा मैम' },
  'mentors.garima.subject': { en: 'Physics Expert', hi: 'फिजिक्स विशेषज्ञ' },
  'mentors.aarav.name': { en: 'Aarav Sir', hi: 'आरव सर' },
  'mentors.aarav.subject': { en: 'Mathematics Expert', hi: 'गणित विशेषज्ञ' },
  'mentors.priya.name': { en: 'Priya Didi', hi: 'प्रिया दीदी' },
  'mentors.priya.subject': { en: 'Chemistry Expert', hi: 'केमिस्ट्री विशेषज्ञ' },
  'mentors.vikram.name': { en: 'Vikram Bhaiya', hi: 'विक्रम भैया' },
  'mentors.vikram.subject': { en: 'Biology Expert', hi: 'बायोलॉजी विशेषज्ञ' },

  // Features
  'features.title': { en: 'Everything You Need to Excel', hi: 'उत्कृष्टता के लिए सब कुछ' },
  'features.subtitle': { en: 'Five powerful tools to help you study smarter', hi: 'होशियारी से पढ़ाई के लिए पांच शक्तिशाली टूल्स' },
  
  // AI Mentor Feature
  'features.aiMentor.title': { en: 'AI Mentor', hi: 'AI मेंटर' },
  'features.aiMentor.desc': { en: 'Talk to Garima Ma\'am - your personal AI tutor available 24/7 for Physics, Chemistry, Maths & Biology.', hi: 'गरिमा मैम से बात करें - आपकी पर्सनल AI ट्यूटर जो 24/7 फिजिक्स, केमिस्ट्री, मैथ्स और बायोलॉजी के लिए उपलब्ध है।' },
  'features.aiMentor.step1': { en: 'Choose your subject', hi: 'अपना विषय चुनें' },
  'features.aiMentor.step2': { en: 'Ask your doubt', hi: 'अपना डाउट पूछें' },
  'features.aiMentor.step3': { en: 'Get instant explanation', hi: 'तुरंत स्पष्टीकरण पाएं' },
  
  // DocSathi Feature
  'features.docSathi.title': { en: 'DocSathi', hi: 'डॉकसाथी' },
  'features.docSathi.desc': { en: 'Upload PDFs, notes or YouTube videos. Ask questions and get instant explanations.', hi: 'PDF, नोट्स या YouTube वीडियो अपलोड करें। सवाल पूछें और तुरंत स्पष्टीकरण पाएं।' },
  'features.docSathi.step1': { en: 'Upload any document', hi: 'कोई भी डॉक्यूमेंट अपलोड करें' },
  'features.docSathi.step2': { en: 'Ask questions about it', hi: 'इसके बारे में सवाल पूछें' },
  'features.docSathi.step3': { en: 'Get answers with citations', hi: 'सिटेशन के साथ जवाब पाएं' },
  
  // DocSathi Hero Section
  'docSathi.badge': { en: 'AI Document Assistant', hi: 'AI डॉक्यूमेंट असिस्टेंट' },
  'docSathi.tagline': { en: 'Your Study Companion', hi: 'आपका स्टडी साथी' },
  'docSathi.title1': { en: 'Upload Any Document,', hi: 'कोई भी डॉक्यूमेंट अपलोड करें,' },
  'docSathi.title2': { en: 'Get Instant Answers', hi: 'तुरंत जवाब पाएं' },
  'docSathi.subtitle': { en: 'Upload PDFs, textbook images, YouTube videos or any study material. Ask questions in Hindi or English and get instant explanations with exact citations.', hi: 'PDF, टेक्स्टबुक इमेज, YouTube वीडियो या कोई भी स्टडी मटेरियल अपलोड करें। हिंदी या अंग्रेजी में सवाल पूछें और सटीक सिटेशन के साथ तुरंत स्पष्टीकरण पाएं।' },
  'docSathi.greeting': { en: 'Upload your study material and I\'ll help you understand any concept. Just ask me anything!', hi: 'अपना स्टडी मटेरियल अपलोड करें और मैं आपको कोई भी कॉन्सेप्ट समझने में मदद करूंगा। बस मुझसे कुछ भी पूछें!' },
  'docSathi.ready': { en: 'Ready to help', hi: 'मदद के लिए तैयार' },
  'docSathi.feature1': { en: 'Supports PDF, Images, Videos & Web Links', hi: 'PDF, इमेज, वीडियो और वेब लिंक सपोर्ट करता है' },
  'docSathi.feature2': { en: 'Answers with exact page citations', hi: 'सटीक पेज सिटेशन के साथ जवाब' },
  'docSathi.feature3': { en: 'Ask in Hindi or English, anytime', hi: 'हिंदी या अंग्रेजी में पूछें, कभी भी' },
  'docSathi.cta': { en: 'Try DocSathi Free', hi: 'डॉकसाथी मुफ्त में आज़माएं' },
  
  // Quiz Feature
  'features.quiz.title': { en: 'AI Quiz Generator', hi: 'AI क्विज जेनरेटर' },
  'features.quiz.desc': { en: 'Generate practice quizzes from any topic. Track your progress and improve.', hi: 'किसी भी विषय से अभ्यास क्विज बनाएं। अपनी प्रगति ट्रैक करें और सुधार करें।' },
  'features.quiz.step1': { en: 'Pick your topic', hi: 'अपना टॉपिक चुनें' },
  'features.quiz.step2': { en: 'Generate quiz instantly', hi: 'तुरंत क्विज बनाएं' },
  'features.quiz.step3': { en: 'Practice and improve', hi: 'अभ्यास करें और सुधारें' },
  
  // Study Plan Feature
  'features.studyPlan.title': { en: 'Smart Study Plan', hi: 'स्मार्ट स्टडी प्लान' },
  'features.studyPlan.desc': { en: 'AI creates personalized study schedules based on your goals and exam dates.', hi: 'AI आपके लक्ष्यों और परीक्षा तिथियों के आधार पर व्यक्तिगत स्टडी शेड्यूल बनाता है।' },
  'features.studyPlan.step1': { en: 'Set your exam date', hi: 'अपनी परीक्षा तिथि सेट करें' },
  'features.studyPlan.step2': { en: 'AI creates schedule', hi: 'AI शेड्यूल बनाता है' },
  'features.studyPlan.step3': { en: 'Follow daily tasks', hi: 'रोजाना टास्क फॉलो करें' },
  
  // Notes Feature
  'features.notes.title': { en: 'Smart Notes', hi: 'स्मार्ट नोट्स' },
  'features.notes.desc': { en: 'Take notes with AI assistance. Summarize, explain, and organize automatically.', hi: 'AI सहायता से नोट्स लें। स्वचालित रूप से सारांश, व्याख्या और व्यवस्थित करें।' },
  'features.notes.step1': { en: 'Write or import notes', hi: 'नोट्स लिखें या इम्पोर्ट करें' },
  'features.notes.step2': { en: 'AI organizes them', hi: 'AI उन्हें व्यवस्थित करता है' },
  'features.notes.step3': { en: 'Revise anytime', hi: 'कभी भी दोहराएं' },
  
  'features.tryNow': { en: 'Try Now', hi: 'अभी आज़माएं' },

  // Comparison
  'compare.title': { en: 'Why Choose VaktaAI?', hi: 'VaktaAI क्यों चुनें?' },
  'compare.coaching': { en: 'Coaching Classes', hi: 'कोचिंग क्लासेस' },
  'compare.vaktaai': { en: 'VaktaAI', hi: 'VaktaAI' },
  'compare.cost': { en: 'Cost', hi: 'लागत' },
  'compare.coaching.cost': { en: '₹50,000 - ₹2,00,000/year', hi: '₹50,000 - ₹2,00,000/साल' },
  'compare.vaktaai.cost': { en: 'FREE / ₹99 per month', hi: 'मुफ्त / ₹99 प्रति माह' },
  'compare.availability': { en: 'Availability', hi: 'उपलब्धता' },
  'compare.coaching.availability': { en: 'Fixed timings only', hi: 'केवल निश्चित समय' },
  'compare.vaktaai.availability': { en: '24/7 Anytime', hi: '24/7 कभी भी' },
  'compare.attention': { en: 'Personal Attention', hi: 'व्यक्तिगत ध्यान' },
  'compare.coaching.attention': { en: '1 teacher : 50+ students', hi: '1 शिक्षक : 50+ छात्र' },
  'compare.vaktaai.attention': { en: '1-on-1 dedicated', hi: '1-से-1 समर्पित' },
  'compare.doubts': { en: 'Doubt Solving', hi: 'डाउट सॉल्विंग' },
  'compare.coaching.doubts': { en: 'Limited time', hi: 'सीमित समय' },
  'compare.vaktaai.doubts': { en: 'Instant, unlimited', hi: 'तुरंत, असीमित' },

  // Stats
  'stats.students': { en: '10 Lakh+ Students', hi: '10 लाख+ छात्र' },
  'stats.rating': { en: '4.8/5 Rating', hi: '4.8/5 रेटिंग' },
  'stats.improvement': { en: '85% Score Improvement', hi: '85% स्कोर सुधार' },
  'stats.doubts': { en: '1 Crore+ Doubts Solved', hi: '1 करोड़+ सवाल हल' },

  // Testimonials
  'testimonials.title': { en: 'Student Success Stories', hi: 'छात्रों की सफलता की कहानियां' },

  // FAQ
  'faq.title': { en: 'Frequently Asked Questions', hi: 'अक्सर पूछे जाने वाले सवाल' },
  'faq.q1': { en: 'Is VaktaAI really free?', hi: 'क्या VaktaAI सच में मुफ्त है?' },
  'faq.a1': { en: 'Yes! Basic features are completely free. Premium features are available at just ₹99/month.', hi: 'हाँ! बेसिक फीचर्स पूरी तरह से मुफ्त हैं। प्रीमियम फीचर्स केवल ₹99/माह पर उपलब्ध हैं।' },
  'faq.q2': { en: 'Can I study in Hindi?', hi: 'क्या मैं हिंदी में पढ़ सकता हूं?' },
  'faq.a2': { en: 'Absolutely! Our AI mentors can explain concepts in both Hindi and English.', hi: 'बिल्कुल! हमारे AI मेंटर्स हिंदी और अंग्रेजी दोनों में अवधारणाओं को समझा सकते हैं।' },
  'faq.q3': { en: 'Which exams does VaktaAI cover?', hi: 'VaktaAI किन परीक्षाओं को कवर करता है?' },
  'faq.a3': { en: 'We cover JEE Main & Advanced, NEET UG, CBSE, ICSE, and all State Board exams for Class 6-12.', hi: 'हम JEE मेन और एडवांस्ड, NEET UG, CBSE, ICSE और कक्षा 6-12 के सभी राज्य बोर्ड परीक्षाओं को कवर करते हैं।' },
  'faq.q4': { en: 'How is AI better than a real tutor?', hi: 'AI असली ट्यूटर से कैसे बेहतर है?' },
  'faq.a4': { en: 'AI is available 24/7, never gets tired, gives instant responses, and remembers your learning history to personalize explanations.', hi: 'AI 24/7 उपलब्ध है, कभी थकता नहीं, तुरंत जवाब देता है, और आपके सीखने के इतिहास को याद रखकर व्याख्या को व्यक्तिगत बनाता है।' },

  // CTA
  'cta.title': { en: 'Ready to Start Learning?', hi: 'सीखना शुरू करने के लिए तैयार हैं?' },
  'cta.subtitle': { en: 'Join 10 lakh+ students who are already learning with VaktaAI', hi: '10 लाख+ छात्रों से जुड़ें जो पहले से VaktaAI के साथ सीख रहे हैं' },
  'cta.button': { en: 'Start Learning Now - It\'s Free!', hi: 'अभी सीखना शुरू करें - यह मुफ्त है!' },

  // Footer
  'footer.tagline': { en: 'Making quality education accessible to every Indian student', hi: 'हर भारतीय छात्र के लिए गुणवत्तापूर्ण शिक्षा सुलभ बनाना' },
  'footer.copyright': { en: '© 2025 VaktaAI. All rights reserved.', hi: '© 2025 VaktaAI. सर्वाधिकार सुरक्षित।' },

  // ============================================
  // AUTHENTICATION
  // ============================================
  'auth.login': { en: 'Login', hi: 'लॉगिन' },
  'auth.signup': { en: 'Sign Up', hi: 'साइन अप' },
  'auth.welcomeBack': { en: 'Welcome back!', hi: 'वापस स्वागत है!' },
  'auth.createAccount': { en: 'Create account', hi: 'अकाउंट बनाएं' },
  'auth.loginSubtitle': { en: 'Sign in to continue your learning journey', hi: 'अपनी पढ़ाई जारी रखने के लिए साइन इन करें' },
  'auth.signupSubtitle': { en: 'Join 10 lakh+ students learning with AI', hi: '10 लाख+ छात्रों के साथ AI से सीखें' },
  
  // Form Labels
  'auth.email': { en: 'Email address', hi: 'ईमेल एड्रेस' },
  'auth.emailPlaceholder': { en: 'you@example.com', hi: 'you@example.com' },
  'auth.password': { en: 'Password', hi: 'पासवर्ड' },
  'auth.passwordPlaceholder': { en: 'Enter your password', hi: 'अपना पासवर्ड डालें' },
  'auth.firstName': { en: 'First name', hi: 'पहला नाम' },
  'auth.firstNamePlaceholder': { en: 'Rahul', hi: 'राहुल' },
  'auth.lastName': { en: 'Last name', hi: 'आखिरी नाम' },
  'auth.lastNamePlaceholder': { en: 'Kumar', hi: 'कुमार' },
  'auth.passwordHint': { en: 'Min 8 characters', hi: 'कम से कम 8 अक्षर' },
  
  // Buttons
  'auth.signinButton': { en: 'Sign in', hi: 'साइन इन करें' },
  'auth.signingIn': { en: 'Signing in...', hi: 'साइन इन हो रहा है...' },
  'auth.createButton': { en: 'Create account', hi: 'अकाउंट बनाएं' },
  'auth.creatingAccount': { en: 'Creating account...', hi: 'अकाउंट बन रहा है...' },
  
  // Messages
  'auth.loginSuccess': { en: 'Welcome back!', hi: 'वापस स्वागत है!' },
  'auth.loginSuccessDesc': { en: 'You have successfully logged in.', hi: 'आप सफलतापूर्वक लॉगिन हो गए।' },
  'auth.signupSuccess': { en: 'Account created!', hi: 'अकाउंट बन गया!' },
  'auth.signupSuccessDesc': { en: 'Welcome to VaktaAI. Let\'s get started!', hi: 'VaktaAI में आपका स्वागत है। चलिए शुरू करते हैं!' },
  'auth.loginFailed': { en: 'Login failed', hi: 'लॉगिन असफल' },
  'auth.loginFailedDesc': { en: 'Invalid email or password', hi: 'गलत ईमेल या पासवर्ड' },
  'auth.signupFailed': { en: 'Signup failed', hi: 'साइनअप असफल' },
  'auth.signupFailedDesc': { en: 'Could not create account', hi: 'अकाउंट नहीं बन सका' },
  
  // Validation
  'auth.invalidEmail': { en: 'Please enter a valid email', hi: 'कृपया सही ईमेल डालें' },
  'auth.passwordRequired': { en: 'Password is required', hi: 'पासवर्ड ज़रूरी है' },
  'auth.passwordMin': { en: 'Password must be at least 8 characters', hi: 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए' },
  'auth.firstNameRequired': { en: 'First name is required', hi: 'पहला नाम ज़रूरी है' },
  
  // Benefits
  'auth.benefit1': { en: '24/7 AI Mentor Access', hi: '24/7 AI मेंटर एक्सेस' },
  'auth.benefit2': { en: 'Personalized Study Plans', hi: 'व्यक्तिगत स्टडी प्लान' },
  'auth.benefit3': { en: 'Unlimited Doubt Solving', hi: 'असीमित डाउट सॉल्विंग' },
  'auth.freeForever': { en: 'Free forever for basic features', hi: 'बेसिक फीचर्स हमेशा के लिए मुफ्त' },
  
  // Brand
  'brand.name': { en: 'VaktaAI', hi: 'VaktaAI' },
  'brand.logoAlt': { en: 'VaktaAI Logo', hi: 'VaktaAI लोगो' },

  // Onboarding
  'onboarding.welcome': { en: 'Welcome to VaktaAI', hi: 'VaktaAI में स्वागत है' },
  'onboarding.subtitle': { en: 'Let\'s personalize your learning experience', hi: 'आपका सीखने का अनुभव बेहतर बनाते हैं' },
  'onboarding.stepOf': { en: 'Step {current} of {total}', hi: 'स्टेप {current} / {total}' },
  
  // Onboarding - Language Step
  'onboarding.language.title': { en: 'Choose Your Language', hi: 'अपनी भाषा चुनें' },
  'onboarding.language.subtitle': { en: 'Select your preferred learning language', hi: 'अपनी पसंदीदा सीखने की भाषा चुनें' },
  'onboarding.language.english': { en: 'English', hi: 'English' },
  'onboarding.language.hindi': { en: 'Hindi', hi: 'हिंदी' },
  
  // Onboarding - Board Step
  'onboarding.board.title': { en: 'Select Your Board', hi: 'अपना बोर्ड चुनें' },
  'onboarding.board.subtitle': { en: 'Which education board are you studying in?', hi: 'आप किस बोर्ड में पढ़ रहे हो?' },
  'onboarding.board.cbse': { en: 'CBSE', hi: 'CBSE' },
  'onboarding.board.icse': { en: 'ICSE', hi: 'ICSE' },
  'onboarding.board.state': { en: 'State Board', hi: 'स्टेट बोर्ड' },
  'onboarding.board.other': { en: 'Other', hi: 'अन्य' },
  
  // Onboarding - Class Step
  'onboarding.class.title': { en: 'Select Your Class', hi: 'अपनी क्लास चुनें' },
  'onboarding.class.subtitle': { en: 'Which class are you currently in?', hi: 'आप किस क्लास में हो?' },
  'onboarding.class.10th': { en: 'Class 10', hi: 'क्लास 10' },
  'onboarding.class.11th': { en: 'Class 11', hi: 'क्लास 11' },
  'onboarding.class.12th': { en: 'Class 12', hi: 'क्लास 12' },
  'onboarding.class.dropper': { en: 'Dropper', hi: 'ड्रॉपर' },
  
  // Onboarding - Exam Step
  'onboarding.exam.title': { en: 'Your Exam Goal', hi: 'आपका एग्जाम गोल' },
  'onboarding.exam.subtitle': { en: 'What exam are you preparing for?', hi: 'किस एग्जाम की तैयारी कर रहे हो?' },
  'onboarding.exam.board': { en: 'Board Exams', hi: 'बोर्ड एग्जाम' },
  'onboarding.exam.jeeMain': { en: 'JEE Main', hi: 'JEE Main' },
  'onboarding.exam.jeeAdv': { en: 'JEE Advanced', hi: 'JEE Advanced' },
  'onboarding.exam.neet': { en: 'NEET', hi: 'NEET' },
  
  // Onboarding - Subjects Step
  'onboarding.subjects.title': { en: 'Pick Your Subjects', hi: 'अपने सब्जेक्ट्स चुनें' },
  'onboarding.subjects.subtitle': { en: 'Select subjects you want to learn (at least 1)', hi: 'जो सब्जेक्ट्स पढ़ना चाहते हो वो चुनें (कम से कम 1)' },
  'onboarding.subjects.physics': { en: 'Physics', hi: 'फिजिक्स' },
  'onboarding.subjects.chemistry': { en: 'Chemistry', hi: 'केमिस्ट्री' },
  'onboarding.subjects.maths': { en: 'Mathematics', hi: 'मैथ्स' },
  'onboarding.subjects.biology': { en: 'Biology', hi: 'बायोलॉजी' },
  'onboarding.subjects.minRequired': { en: 'Please select at least one subject', hi: 'कम से कम एक सब्जेक्ट चुनें' },
  
  // Onboarding - Mentor Step
  'onboarding.mentor.title': { en: 'Meet Your AI Mentor', hi: 'अपने AI मेंटर से मिलें' },
  'onboarding.mentor.subtitle': { en: 'Your personal tutor, available 24/7', hi: 'आपका पर्सनल ट्यूटर, 24/7 उपलब्ध' },
  'onboarding.mentor.garima': { en: 'Garima Ma\'am', hi: 'गरिमा मैम' },
  'onboarding.mentor.garimaDesc': { en: 'Physics & Chemistry Expert', hi: 'फिजिक्स और केमिस्ट्री एक्सपर्ट' },
  'onboarding.mentor.arjun': { en: 'Arjun Sir', hi: 'अर्जुन सर' },
  'onboarding.mentor.arjunDesc': { en: 'Mathematics Expert', hi: 'मैथ्स एक्सपर्ट' },
  
  // Onboarding - Navigation
  'onboarding.next': { en: 'Continue', hi: 'आगे बढ़ें' },
  'onboarding.back': { en: 'Back', hi: 'पीछे' },
  'onboarding.getStarted': { en: 'Get Started', hi: 'शुरू करें' },
  'onboarding.loading': { en: 'Setting up...', hi: 'सेटअप हो रहा है...' },
  'onboarding.success': { en: 'All set! Let\'s start learning', hi: 'तैयार! चलो पढ़ाई शुरू करें' },
  'onboarding.error': { en: 'Something went wrong. Please try again.', hi: 'कुछ गलत हुआ। फिर से कोशिश करें।' },

  // Common
  'common.loading': { en: 'Loading...', hi: 'लोड हो रहा है...' },
  'common.error': { en: 'Something went wrong', hi: 'कुछ गलत हो गया' },
  'common.tryAgain': { en: 'Try Again', hi: 'फिर से कोशिश करें' },
  'common.learnMore': { en: 'Learn More', hi: 'और जानें' },
  'common.getStarted': { en: 'Get Started', hi: 'शुरू करें' },
  'common.onlineNow': { en: 'Online now', hi: 'अभी ऑनलाइन' },

  // Avatar/Mentor chat
  'avatar.clickToMeet': { en: 'Click to meet your AI Mentor', hi: 'अपने AI मेंटर से मिलने के लिए क्लिक करें' },
  'avatar.greeting': { en: 'Hello! I\'m your AI mentor. Ask me anything about Physics, Chemistry, Maths or Biology. I\'m here to help you learn 24/7!', hi: 'नमस्ते! मैं आपका AI मेंटर हूं। फिजिक्स, केमिस्ट्री, मैथ्स या बायोलॉजी के बारे में कुछ भी पूछें। मैं 24/7 आपकी मदद के लिए यहां हूं!' },

  // Mentor expertise
  'mentor.expertIn': { en: 'Expert in', hi: 'विशेषज्ञ' },
  'subject.physics': { en: 'Physics', hi: 'फिजिक्स' },
  'subject.chemistry': { en: 'Chemistry', hi: 'केमिस्ट्री' },
  'subject.maths': { en: 'Maths', hi: 'गणित' },
  'subject.biology': { en: 'Biology', hi: 'बायोलॉजी' },

  // ============================================
  // AI MENTOR PAGE
  // ============================================
  'aiMentor.title': { en: 'AI Mentor', hi: 'AI मेंटर' },
  'aiMentor.subtitle': { en: 'Your Personal Study Companion', hi: 'आपका व्यक्तिगत अध्ययन साथी' },
  'aiMentor.description': { en: 'Ask any doubt, get instant answers with voice support. Learn with Garima Ma\'am - available 24/7!', hi: 'कोई भी सवाल पूछें, वॉइस सपोर्ट के साथ तुरंत जवाब पाएं। गरिमा मैम के साथ सीखें - 24/7 उपलब्ध!' },
  'aiMentor.startSession': { en: 'Start New Session', hi: 'नया सेशन शुरू करें' },
  'aiMentor.startingSession': { en: 'Starting Session...', hi: 'सेशन शुरू हो रहा है...' },
  'aiMentor.loadingAvatar': { en: 'Loading Avatar...', hi: 'अवतार लोड हो रहा है...' },
  'aiMentor.avatarReady': { en: 'Avatar Ready - Start Session!', hi: 'अवतार तैयार - सेशन शुरू करें!' },
  'aiMentor.continueSession': { en: 'Continue Session', hi: 'सेशन जारी रखें' },
  
  // AI Mentor - Choose Subject
  'aiMentor.chooseSubject': { en: 'Choose Your Subject', hi: 'अपना विषय चुनें' },
  'aiMentor.quickStart': { en: 'Quick Start', hi: 'जल्दी शुरू करें' },
  'aiMentor.selectTopic': { en: 'Select a topic to begin', hi: 'शुरू करने के लिए टॉपिक चुनें' },
  'aiMentor.selectSubjectStart': { en: 'Select a subject and start learning instantly', hi: 'विषय चुनें और तुरंत सीखना शुरू करें' },
  'aiMentor.startNow': { en: 'Start Learning Now', hi: 'अभी सीखना शुरू करें' },
  'aiMentor.customize': { en: 'Customize', hi: 'कस्टमाइज़ करें' },
  'aiMentor.customizeTitle': { en: 'Customize Your Learning', hi: 'अपनी पढ़ाई कस्टमाइज़ करें' },
  'aiMentor.customizeSubtitle': { en: 'Fine-tune your learning experience', hi: 'अपने सीखने का अनुभव बेहतर बनाएं' },
  'aiMentor.advancedOptions': { en: 'Advanced', hi: 'एडवांस्ड' },
  'aiMentor.openSetupWizard': { en: 'Open Setup Wizard', hi: 'सेटअप विज़ार्ड खोलें' },
  'aiMentor.option.topic': { en: 'Topic', hi: 'टॉपिक' },
  'aiMentor.option.selectTopic': { en: 'Choose specific', hi: 'चुनें' },
  'aiMentor.option.level': { en: 'Difficulty', hi: 'कठिनाई' },
  'aiMentor.option.selectLevel': { en: 'Set your pace', hi: 'अपनी गति सेट करें' },
  'aiMentor.option.language': { en: 'Language', hi: 'भाषा' },
  'aiMentor.option.selectLang': { en: 'Hindi/English', hi: 'हिंदी/इंग्लिश' },
  'aiMentor.option.exam': { en: 'Exam Type', hi: 'परीक्षा प्रकार' },
  'aiMentor.option.selectExam': { en: 'JEE/NEET/Board', hi: 'JEE/NEET/बोर्ड' },

  // AI Mentor - Features
  'aiMentor.features.voice': { en: 'Voice Learning', hi: 'वॉइस लर्निंग' },
  'aiMentor.features.voiceDesc': { en: 'Talk naturally like a real conversation', hi: 'असली बातचीत की तरह बात करें' },
  'aiMentor.features.smart': { en: 'Smart AI Mentor', hi: 'स्मार्ट AI मेंटर' },
  'aiMentor.features.smartDesc': { en: 'Explains in Hindi or English', hi: 'हिंदी या अंग्रेजी में समझाता है' },
  'aiMentor.features.subjects': { en: 'All Subjects', hi: 'सभी विषय' },
  'aiMentor.features.subjectsDesc': { en: 'Physics, Chemistry, Maths, Biology', hi: 'फिजिक्स, केमिस्ट्री, मैथ्स, बायोलॉजी' },
  'aiMentor.features.instant': { en: 'Instant Doubts', hi: 'तुरंत सवाल' },
  'aiMentor.features.instantDesc': { en: 'No waiting - ask anytime', hi: 'कोई इंतज़ार नहीं - कभी भी पूछें' },

  // AI Mentor - Stats
  'aiMentor.stats.sessions': { en: 'Sessions', hi: 'सेशन्स' },
  'aiMentor.stats.questions': { en: 'Questions Asked', hi: 'सवाल पूछे गए' },
  'aiMentor.stats.accuracy': { en: 'Accuracy', hi: 'सटीकता' },
  'aiMentor.stats.progress': { en: 'Progress', hi: 'प्रगति' },
  'aiMentor.stats.thisWeek': { en: 'This Week', hi: 'इस हफ्ते' },
  'aiMentor.stats.conceptsMastered': { en: 'Concepts Mastered', hi: 'समझी गई अवधारणाएं' },

  // AI Mentor - How it works
  'aiMentor.howItWorks': { en: 'How It Works', hi: 'यह कैसे काम करता है' },
  'aiMentor.step1': { en: 'Choose your subject and topic', hi: 'अपना विषय और टॉपिक चुनें' },
  'aiMentor.step2': { en: 'Pick your learning level (Class 6-12)', hi: 'अपना लर्निंग लेवल चुनें (कक्षा 6-12)' },
  'aiMentor.step3': { en: 'Start talking to Garima Ma\'am', hi: 'गरिमा मैम से बात शुरू करें' },
  'aiMentor.step4': { en: 'Ask doubts, practice problems, master concepts!', hi: 'सवाल पूछें, प्रॉब्लम प्रैक्टिस करें, कॉन्सेप्ट मास्टर करें!' },

  // AI Mentor - Pro Tip
  'aiMentor.proTip': { en: 'Pro Tip', hi: 'प्रो टिप' },
  'aiMentor.proTipText': { en: 'Ask "Can you explain this with an example?" for better understanding. Garima Ma\'am loves explaining with real-life examples!', hi: '"क्या आप इसे एक उदाहरण से समझा सकते हैं?" पूछें। गरिमा मैम को वास्तविक जीवन के उदाहरणों से समझाना पसंद है!' },

  // AI Mentor - Recent Sessions
  'aiMentor.recentSessions': { en: 'Recent Sessions', hi: 'हाल के सेशन्स' },
  'aiMentor.noSessions': { en: 'No sessions yet', hi: 'अभी तक कोई सेशन नहीं' },
  'aiMentor.learningStats': { en: 'Your Learning Stats', hi: 'आपके लर्निंग आंकड़े' },
  'aiMentor.mentorSession': { en: 'Mentor Session', hi: 'मेंटर सेशन' },
  'aiMentor.generalDiscussion': { en: 'General discussion', hi: 'सामान्य चर्चा' },
  'aiMentor.hours': { en: 'hours', hi: 'घंटे' },

  // AI Mentor - Toast Messages
  'toast.sessionStarted': { en: 'Session Started', hi: 'सेशन शुरू हुआ' },
  'toast.sessionStartedDesc': { en: 'Your AI mentor Garima Ma\'am is ready!', hi: 'आपकी AI मेंटर गरिमा मैम तैयार हैं!' },
  'toast.sessionEnded': { en: 'Session Ended', hi: 'सेशन समाप्त' },
  'toast.sessionEndedDesc': { en: 'Your mentor session has been saved.', hi: 'आपका मेंटर सेशन सेव हो गया।' },
  'toast.error': { en: 'Error', hi: 'त्रुटि' },
  'toast.failedToStart': { en: 'Failed to start mentor session. Please try again.', hi: 'मेंटर सेशन शुरू करने में विफल। कृपया पुनः प्रयास करें।' },
  'toast.success': { en: 'Success', hi: 'सफल' },

  // AI Mentor - Physics Topics
  'topic.physics.mechanics': { en: 'Mechanics', hi: 'मैकेनिक्स' },
  'topic.physics.optics': { en: 'Optics', hi: 'प्रकाशिकी' },
  'topic.physics.thermodynamics': { en: 'Thermodynamics', hi: 'ऊष्मागतिकी' },
  'topic.physics.electromagnetism': { en: 'Electromagnetism', hi: 'विद्युत चुंबकत्व' },

  // AI Mentor - Chemistry Topics
  'topic.chemistry.organic': { en: 'Organic', hi: 'कार्बनिक' },
  'topic.chemistry.inorganic': { en: 'Inorganic', hi: 'अकार्बनिक' },
  'topic.chemistry.physical': { en: 'Physical Chemistry', hi: 'भौतिक रसायन' },
  'topic.chemistry.equilibrium': { en: 'Equilibrium', hi: 'साम्यावस्था' },

  // AI Mentor - Maths Topics
  'topic.maths.calculus': { en: 'Calculus', hi: 'कलन' },
  'topic.maths.algebra': { en: 'Algebra', hi: 'बीजगणित' },
  'topic.maths.trigonometry': { en: 'Trigonometry', hi: 'त्रिकोणमिति' },
  'topic.maths.coordinate': { en: 'Coordinate Geometry', hi: 'निर्देशांक ज्यामिति' },

  // AI Mentor - Biology Topics
  'topic.biology.botany': { en: 'Botany', hi: 'वनस्पति विज्ञान' },
  'topic.biology.zoology': { en: 'Zoology', hi: 'प्राणी विज्ञान' },
  'topic.biology.physiology': { en: 'Human Physiology', hi: 'मानव शरीर क्रिया विज्ञान' },
  'topic.biology.genetics': { en: 'Genetics', hi: 'आनुवंशिकी' },

  // ============================================
  // DOCSATHI PAGE (formerly DocChat)
  // ============================================
  'docSathi.title': { en: 'DocSathi', hi: 'डॉकसाथी' },
  'docSathi.subtitle': { en: 'Your Document Study Partner', hi: 'आपका डॉक्यूमेंट स्टडी पार्टनर' },
  'docSathi.description': { en: 'Upload PDFs, lecture notes, YouTube videos - ask questions and get instant answers with citations!', hi: 'PDF, लेक्चर नोट्स, YouTube वीडियो अपलोड करें - सवाल पूछें और सोर्स के साथ तुरंत जवाब पाएं!' },
  'docSathi.uploadHello': { en: 'Upload and chat with your documents', hi: 'अपने डॉक्यूमेंट अपलोड करें और चैट करें' },
  'docSathi.uploadSubtitle': { en: 'Upload lecture notes, articles, any document, and VaktaAI will help you understand them.', hi: 'लेक्चर नोट्स, आर्टिकल्स, कोई भी डॉक्यूमेंट अपलोड करें, और VaktaAI आपको समझने में मदद करेगा।' },

  // DocSathi - Upload
  'docSathi.supports': { en: 'DocSathi supports', hi: 'DocSathi सपोर्ट करता है' },
  'docSathi.uploadPlaceholder': { en: 'Upload PDFs, PPTx, Docx, MP3, MP4 or Paste a URL', hi: 'PDF, PPTx, Docx, MP3, MP4 अपलोड करें या URL पेस्ट करें' },
  'docSathi.add': { en: 'Add', hi: 'जोड़ें' },
  'docSathi.uploading': { en: 'Uploading...', hi: 'अपलोड हो रहा है...' },

  // DocSathi - Tabs
  'docSathi.tabUpload': { en: 'Upload', hi: 'अपलोड' },
  'docSathi.tabPrevious': { en: 'Previous Sources', hi: 'पिछले सोर्स' },
  'docSathi.justUploaded': { en: 'Just Uploaded', hi: 'अभी अपलोड किया' },
  'docSathi.viewAll': { en: 'View all documents', hi: 'सभी डॉक्यूमेंट देखें' },
  'docSathi.noPrevious': { en: 'No previous documents', hi: 'कोई पिछला डॉक्यूमेंट नहीं' },

  // DocSathi - Selection
  'docSathi.selectedDocs': { en: 'Selected Documents', hi: 'चयनित डॉक्यूमेंट' },
  'docSathi.noDocsSelected': { en: 'No documents selected', hi: 'कोई डॉक्यूमेंट चयनित नहीं' },
  'docSathi.addFromSources': { en: 'Add from sources', hi: 'सोर्स से जोड़ें' },
  'docSathi.startChat': { en: 'Start Chat', hi: 'चैट शुरू करें' },
  'docSathi.starting': { en: 'Starting...', hi: 'शुरू हो रहा है...' },

  // DocSathi - Features
  'docSathi.features.smart': { en: 'Smart Analysis', hi: 'स्मार्ट एनालिसिस' },
  'docSathi.features.smartDesc': { en: 'AI reads and understands your documents', hi: 'AI आपके डॉक्यूमेंट पढ़ता और समझता है' },
  'docSathi.features.citations': { en: 'Source Citations', hi: 'सोर्स सिटेशन' },
  'docSathi.features.citationsDesc': { en: 'Every answer shows page numbers', hi: 'हर जवाब में पेज नंबर दिखता है' },
  'docSathi.features.multi': { en: 'Multiple Formats', hi: 'कई फॉर्मेट' },
  'docSathi.features.multiDesc': { en: 'PDF, DOCX, PPT, YouTube, Web', hi: 'PDF, DOCX, PPT, YouTube, वेब' },
  'docSathi.features.actions': { en: 'Quick Actions', hi: 'क्विक एक्शन्स' },
  'docSathi.features.actionsDesc': { en: 'Summary, Flashcards, Quiz, Highlights', hi: 'सारांश, फ्लैशकार्ड, क्विज, हाइलाइट्स' },

  // DocSathi - Supported formats (full names)
  'docSathi.format.pdf': { en: 'PDF Documents', hi: 'PDF डॉक्यूमेंट' },
  'docSathi.format.doc': { en: 'Word Documents', hi: 'वर्ड डॉक्यूमेंट' },
  'docSathi.format.ppt': { en: 'Presentations', hi: 'प्रेजेंटेशन' },
  'docSathi.format.youtube': { en: 'YouTube Videos', hi: 'YouTube वीडियो' },
  'docSathi.format.audio': { en: 'Audio Files', hi: 'ऑडियो फाइल्स' },
  'docSathi.format.web': { en: 'Web Pages', hi: 'वेब पेज' },

  // DocSathi - Format badges (short names)
  'docSathi.formatBadge.pdf': { en: 'PDF', hi: 'PDF' },
  'docSathi.formatBadge.doc': { en: 'DOCX', hi: 'DOCX' },
  'docSathi.formatBadge.images': { en: 'Images', hi: 'इमेज' },
  'docSathi.formatBadge.youtube': { en: 'YouTube', hi: 'YouTube' },
  'docSathi.formatBadge.audio': { en: 'Audio', hi: 'ऑडियो' },
  'docSathi.formatBadge.web': { en: 'Web', hi: 'वेब' },

  // DocSathi - Actions
  'docSathi.action.summary': { en: 'Summary', hi: 'सारांश' },
  'docSathi.action.highlights': { en: 'Highlights', hi: 'हाइलाइट्स' },
  'docSathi.action.quiz': { en: 'Generate Quiz', hi: 'क्विज बनाएं' },
  'docSathi.action.flashcards': { en: 'Flashcards', hi: 'फ्लैशकार्ड्स' },

  // DocSathi - Toast Messages
  'docSathi.toast.uploaded': { en: 'Document uploaded successfully', hi: 'डॉक्यूमेंट सफलतापूर्वक अपलोड हुआ' },
  'docSathi.toast.uploadFailed': { en: 'Failed to upload document', hi: 'डॉक्यूमेंट अपलोड करने में विफल' },
  'docSathi.toast.urlAdded': { en: 'URL added successfully', hi: 'URL सफलतापूर्वक जोड़ा गया' },
  'docSathi.toast.urlFailed': { en: 'Failed to add URL', hi: 'URL जोड़ने में विफल' },
  'docSathi.toast.deleted': { en: 'Document deleted successfully', hi: 'डॉक्यूमेंट सफलतापूर्वक हटा दिया गया' },
  'docSathi.toast.deleteFailed': { en: 'Failed to delete document', hi: 'डॉक्यूमेंट हटाने में विफल' },
  'docSathi.toast.noDocSelected': { en: 'No document selected', hi: 'कोई डॉक्यूमेंट चयनित नहीं' },
  'docSathi.toast.selectDocFirst': { en: 'Please select a document to start chatting', hi: 'चैट शुरू करने के लिए कृपया एक डॉक्यूमेंट चुनें' },
  'docSathi.toast.chatFailed': { en: 'Failed to start chat session', hi: 'चैट सेशन शुरू करने में विफल' },

  // DocSathi - How it works steps
  'docSathi.step1': { en: 'Upload any document or paste URL', hi: 'कोई भी डॉक्यूमेंट अपलोड करें या URL पेस्ट करें' },
  'docSathi.step2': { en: 'AI reads and understands content', hi: 'AI कंटेंट पढ़ता और समझता है' },
  'docSathi.step3': { en: 'Ask questions in Hindi or English', hi: 'हिंदी या अंग्रेजी में सवाल पूछें' },
  'docSathi.step4': { en: 'Get answers with page citations', hi: 'पेज सिटेशन के साथ जवाब पाएं' },

  // DocSathi - Pro tip
  'docSathi.proTipText': { en: 'Ask "Summarize chapter 3" or "Explain the formula on page 5" for specific answers with citations!', hi: '"अध्याय 3 का सारांश दें" या "पेज 5 पर फॉर्मूला समझाएं" पूछें - सिटेशन के साथ सटीक जवाब पाएं!' },

  // ============================================
  // COMMON APP TRANSLATIONS
  // ============================================
  'app.aiTutor': { en: 'AI Mentor', hi: 'AI मेंटर' },
  'app.docSathi': { en: 'DocSathi', hi: 'डॉकसाथी' },
  'app.quiz': { en: 'Quiz', hi: 'क्विज' },
  'app.studyPlan': { en: 'Study Plan', hi: 'स्टडी प्लान' },
  'app.notes': { en: 'Notes', hi: 'नोट्स' },
  'app.settings': { en: 'Settings', hi: 'सेटिंग्स' },

  // Common utilities
  'common.userFallback': { en: 'there', hi: 'दोस्त' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vaktaai-language');
      return (saved as Language) || 'en';
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('vaktaai-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 ${className}`}
      data-testid="button-language-toggle"
      aria-label={`Switch to ${language === 'en' ? 'Hindi' : 'English'}`}
    >
      <span className={`transition-opacity ${language === 'en' ? 'opacity-100' : 'opacity-50'}`}>EN</span>
      <span className="text-gray-400">/</span>
      <span className={`transition-opacity ${language === 'hi' ? 'opacity-100' : 'opacity-50'}`}>हिं</span>
    </button>
  );
}
