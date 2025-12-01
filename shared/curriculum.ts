/**
 * Curriculum Data for AI Mentor
 * Contains chapters/topics for each subject organized by class level
 * Aligned with CBSE/NCERT curriculum for Classes 6-12, JEE, and NEET
 */

export interface Chapter {
  id: string;
  nameEn: string;
  nameHi: string;
  topics?: string[];
}

export interface SubjectCurriculum {
  [classLevel: string]: Chapter[];
}

export interface CurriculumData {
  [subject: string]: SubjectCurriculum;
}

// Helper to get chapters based on user profile
export function getChaptersForProfile(
  subject: string,
  currentClass?: string,
  examTarget?: string
): Chapter[] {
  const subjectData = curriculum[subject.toLowerCase()];
  if (!subjectData) return [];

  // Map class to curriculum key
  let classKey = '11-12'; // default

  if (currentClass) {
    const classNum = parseInt(currentClass.replace(/\D/g, ''));
    if (classNum >= 6 && classNum <= 8) classKey = '6-8';
    else if (classNum >= 9 && classNum <= 10) classKey = '9-10';
    else classKey = '11-12';
  }

  // For competitive exams, use 11-12 curriculum
  if (examTarget && ['jee', 'neet', 'jee-advanced', 'jee-mains'].includes(examTarget.toLowerCase())) {
    classKey = '11-12';
  }

  return subjectData[classKey] || subjectData['11-12'] || [];
}

export const curriculum: CurriculumData = {
  physics: {
    '6-8': [
      { id: 'motion-force', nameEn: 'Motion and Force', nameHi: 'गति और बल' },
      { id: 'light-sound', nameEn: 'Light and Sound', nameHi: 'प्रकाश और ध्वनि' },
      { id: 'electricity-basics', nameEn: 'Electricity Basics', nameHi: 'विद्युत की मूल बातें' },
      { id: 'heat-temperature', nameEn: 'Heat and Temperature', nameHi: 'ऊष्मा और तापमान' },
    ],
    '9-10': [
      { id: 'motion', nameEn: 'Motion', nameHi: 'गति' },
      { id: 'force-laws', nameEn: 'Force and Laws of Motion', nameHi: 'बल और गति के नियम' },
      { id: 'gravitation', nameEn: 'Gravitation', nameHi: 'गुरुत्वाकर्षण' },
      { id: 'work-energy', nameEn: 'Work and Energy', nameHi: 'कार्य और ऊर्जा' },
      { id: 'sound', nameEn: 'Sound', nameHi: 'ध्वनि' },
      { id: 'light-reflection', nameEn: 'Light - Reflection and Refraction', nameHi: 'प्रकाश - परावर्तन और अपवर्तन' },
      { id: 'electricity', nameEn: 'Electricity', nameHi: 'विद्युत' },
      { id: 'magnetic-effects', nameEn: 'Magnetic Effects of Electric Current', nameHi: 'विद्युत धारा के चुंबकीय प्रभाव' },
    ],
    '11-12': [
      { id: 'kinematics', nameEn: 'Kinematics', nameHi: 'गतिकी' },
      { id: 'laws-of-motion', nameEn: 'Laws of Motion', nameHi: 'गति के नियम' },
      { id: 'work-energy-power', nameEn: 'Work, Energy and Power', nameHi: 'कार्य, ऊर्जा और शक्ति' },
      { id: 'rotational-motion', nameEn: 'Rotational Motion', nameHi: 'घूर्णन गति' },
      { id: 'gravitation-advanced', nameEn: 'Gravitation', nameHi: 'गुरुत्वाकर्षण' },
      { id: 'oscillations', nameEn: 'Oscillations', nameHi: 'दोलन' },
      { id: 'waves', nameEn: 'Waves', nameHi: 'तरंगें' },
      { id: 'thermodynamics', nameEn: 'Thermodynamics', nameHi: 'ऊष्मागतिकी' },
      { id: 'kinetic-theory', nameEn: 'Kinetic Theory of Gases', nameHi: 'गैसों का गतिज सिद्धांत' },
      { id: 'electrostatics', nameEn: 'Electrostatics', nameHi: 'स्थिर विद्युत' },
      { id: 'current-electricity', nameEn: 'Current Electricity', nameHi: 'धारा विद्युत' },
      { id: 'magnetic-effects-current', nameEn: 'Magnetic Effects of Current', nameHi: 'धारा के चुंबकीय प्रभाव' },
      { id: 'electromagnetic-induction', nameEn: 'Electromagnetic Induction', nameHi: 'विद्युत चुंबकीय प्रेरण' },
      { id: 'alternating-current', nameEn: 'Alternating Current', nameHi: 'प्रत्यावर्ती धारा' },
      { id: 'ray-optics', nameEn: 'Ray Optics', nameHi: 'किरण प्रकाशिकी' },
      { id: 'wave-optics', nameEn: 'Wave Optics', nameHi: 'तरंग प्रकाशिकी' },
      { id: 'modern-physics', nameEn: 'Modern Physics', nameHi: 'आधुनिक भौतिकी' },
      { id: 'atoms-nuclei', nameEn: 'Atoms and Nuclei', nameHi: 'परमाणु और नाभिक' },
      { id: 'semiconductor', nameEn: 'Semiconductor Electronics', nameHi: 'अर्धचालक इलेक्ट्रॉनिक्स' },
    ],
  },

  chemistry: {
    '6-8': [
      { id: 'matter', nameEn: 'Matter and Its Properties', nameHi: 'पदार्थ और उसके गुण' },
      { id: 'elements-compounds', nameEn: 'Elements and Compounds', nameHi: 'तत्व और यौगिक' },
      { id: 'acids-bases', nameEn: 'Acids and Bases', nameHi: 'अम्ल और क्षार' },
      { id: 'metals-nonmetals', nameEn: 'Metals and Non-metals', nameHi: 'धातु और अधातु' },
    ],
    '9-10': [
      { id: 'matter-nature', nameEn: 'Matter in Our Surroundings', nameHi: 'हमारे आस-पास के पदार्थ' },
      { id: 'is-matter-pure', nameEn: 'Is Matter Around Us Pure', nameHi: 'क्या हमारे आस-पास के पदार्थ शुद्ध हैं' },
      { id: 'atoms-molecules', nameEn: 'Atoms and Molecules', nameHi: 'परमाणु और अणु' },
      { id: 'structure-atom', nameEn: 'Structure of the Atom', nameHi: 'परमाणु की संरचना' },
      { id: 'chemical-reactions', nameEn: 'Chemical Reactions and Equations', nameHi: 'रासायनिक अभिक्रियाएं और समीकरण' },
      { id: 'acids-bases-salts', nameEn: 'Acids, Bases and Salts', nameHi: 'अम्ल, क्षार और लवण' },
      { id: 'metals-nonmetals-10', nameEn: 'Metals and Non-metals', nameHi: 'धातु और अधातु' },
      { id: 'carbon-compounds', nameEn: 'Carbon and its Compounds', nameHi: 'कार्बन और उसके यौगिक' },
      { id: 'periodic-classification', nameEn: 'Periodic Classification of Elements', nameHi: 'तत्वों का आवर्त वर्गीकरण' },
    ],
    '11-12': [
      { id: 'basic-concepts', nameEn: 'Some Basic Concepts of Chemistry', nameHi: 'रसायन विज्ञान की कुछ मूल अवधारणाएं' },
      { id: 'atomic-structure', nameEn: 'Structure of Atom', nameHi: 'परमाणु की संरचना' },
      { id: 'periodic-table', nameEn: 'Classification of Elements and Periodicity', nameHi: 'तत्वों का वर्गीकरण और आवर्तिता' },
      { id: 'chemical-bonding', nameEn: 'Chemical Bonding and Molecular Structure', nameHi: 'रासायनिक आबंधन और आणविक संरचना' },
      { id: 'states-of-matter', nameEn: 'States of Matter', nameHi: 'पदार्थ की अवस्थाएं' },
      { id: 'thermodynamics-chem', nameEn: 'Thermodynamics', nameHi: 'ऊष्मागतिकी' },
      { id: 'equilibrium', nameEn: 'Equilibrium', nameHi: 'साम्यावस्था' },
      { id: 'redox-reactions', nameEn: 'Redox Reactions', nameHi: 'रेडॉक्स अभिक्रियाएं' },
      { id: 'organic-chemistry-basics', nameEn: 'Organic Chemistry - Basic Principles', nameHi: 'कार्बनिक रसायन - मूल सिद्धांत' },
      { id: 'hydrocarbons', nameEn: 'Hydrocarbons', nameHi: 'हाइड्रोकार्बन' },
      { id: 'haloalkanes', nameEn: 'Haloalkanes and Haloarenes', nameHi: 'हैलोएल्केन और हैलोएरीन' },
      { id: 'alcohols-phenols', nameEn: 'Alcohols, Phenols and Ethers', nameHi: 'एल्कोहॉल, फिनोल और ईथर' },
      { id: 'aldehydes-ketones', nameEn: 'Aldehydes, Ketones and Carboxylic Acids', nameHi: 'एल्डिहाइड, कीटोन और कार्बोक्सिलिक अम्ल' },
      { id: 'amines', nameEn: 'Amines', nameHi: 'एमाइन' },
      { id: 'biomolecules', nameEn: 'Biomolecules', nameHi: 'जैव अणु' },
      { id: 'coordination-compounds', nameEn: 'Coordination Compounds', nameHi: 'उपसहसंयोजक यौगिक' },
      { id: 'd-f-block', nameEn: 'd and f Block Elements', nameHi: 'd और f ब्लॉक तत्व' },
      { id: 'electrochemistry', nameEn: 'Electrochemistry', nameHi: 'विद्युत रसायन' },
      { id: 'chemical-kinetics', nameEn: 'Chemical Kinetics', nameHi: 'रासायनिक गतिकी' },
      { id: 'surface-chemistry', nameEn: 'Surface Chemistry', nameHi: 'पृष्ठ रसायन' },
    ],
  },

  maths: {
    '6-8': [
      { id: 'numbers', nameEn: 'Numbers and Operations', nameHi: 'संख्याएं और संक्रियाएं' },
      { id: 'fractions-decimals', nameEn: 'Fractions and Decimals', nameHi: 'भिन्न और दशमलव' },
      { id: 'algebra-intro', nameEn: 'Introduction to Algebra', nameHi: 'बीजगणित का परिचय' },
      { id: 'geometry-basics', nameEn: 'Basic Geometry', nameHi: 'मूल ज्यामिति' },
      { id: 'mensuration-intro', nameEn: 'Mensuration', nameHi: 'क्षेत्रमिति' },
    ],
    '9-10': [
      { id: 'number-systems', nameEn: 'Number Systems', nameHi: 'संख्या पद्धति' },
      { id: 'polynomials', nameEn: 'Polynomials', nameHi: 'बहुपद' },
      { id: 'linear-equations', nameEn: 'Linear Equations', nameHi: 'रैखिक समीकरण' },
      { id: 'quadratic-equations', nameEn: 'Quadratic Equations', nameHi: 'द्विघात समीकरण' },
      { id: 'triangles', nameEn: 'Triangles', nameHi: 'त्रिभुज' },
      { id: 'coordinate-geometry-10', nameEn: 'Coordinate Geometry', nameHi: 'निर्देशांक ज्यामिति' },
      { id: 'trigonometry-intro', nameEn: 'Introduction to Trigonometry', nameHi: 'त्रिकोणमिति का परिचय' },
      { id: 'circles', nameEn: 'Circles', nameHi: 'वृत्त' },
      { id: 'areas-volumes', nameEn: 'Areas and Volumes', nameHi: 'क्षेत्रफल और आयतन' },
      { id: 'statistics-10', nameEn: 'Statistics', nameHi: 'सांख्यिकी' },
      { id: 'probability-10', nameEn: 'Probability', nameHi: 'प्रायिकता' },
    ],
    '11-12': [
      { id: 'sets-functions', nameEn: 'Sets and Functions', nameHi: 'समुच्चय और फलन' },
      { id: 'trigonometric-functions', nameEn: 'Trigonometric Functions', nameHi: 'त्रिकोणमितीय फलन' },
      { id: 'complex-numbers', nameEn: 'Complex Numbers', nameHi: 'सम्मिश्र संख्याएं' },
      { id: 'quadratic-inequations', nameEn: 'Quadratic Equations and Inequations', nameHi: 'द्विघात समीकरण और असमिकाएं' },
      { id: 'permutations-combinations', nameEn: 'Permutations and Combinations', nameHi: 'क्रमचय और संचय' },
      { id: 'binomial-theorem', nameEn: 'Binomial Theorem', nameHi: 'द्विपद प्रमेय' },
      { id: 'sequences-series', nameEn: 'Sequences and Series', nameHi: 'अनुक्रम और श्रेणी' },
      { id: 'straight-lines', nameEn: 'Straight Lines', nameHi: 'सरल रेखाएं' },
      { id: 'conic-sections', nameEn: 'Conic Sections', nameHi: 'शंकु परिच्छेद' },
      { id: '3d-geometry', nameEn: 'Three Dimensional Geometry', nameHi: 'त्रिविमीय ज्यामिति' },
      { id: 'limits-derivatives', nameEn: 'Limits and Derivatives', nameHi: 'सीमा और अवकलज' },
      { id: 'continuity-differentiability', nameEn: 'Continuity and Differentiability', nameHi: 'सांतत्य और अवकलनीयता' },
      { id: 'application-derivatives', nameEn: 'Applications of Derivatives', nameHi: 'अवकलज के अनुप्रयोग' },
      { id: 'integrals', nameEn: 'Integrals', nameHi: 'समाकलन' },
      { id: 'application-integrals', nameEn: 'Applications of Integrals', nameHi: 'समाकलन के अनुप्रयोग' },
      { id: 'differential-equations', nameEn: 'Differential Equations', nameHi: 'अवकल समीकरण' },
      { id: 'vectors', nameEn: 'Vectors', nameHi: 'सदिश' },
      { id: 'probability-12', nameEn: 'Probability', nameHi: 'प्रायिकता' },
      { id: 'matrices-determinants', nameEn: 'Matrices and Determinants', nameHi: 'आव्यूह और सारणिक' },
    ],
  },

  biology: {
    '6-8': [
      { id: 'living-organisms', nameEn: 'Living Organisms', nameHi: 'जीव जंतु' },
      { id: 'plant-parts', nameEn: 'Parts of Plants', nameHi: 'पौधों के भाग' },
      { id: 'human-body', nameEn: 'Human Body', nameHi: 'मानव शरीर' },
      { id: 'food-nutrition', nameEn: 'Food and Nutrition', nameHi: 'भोजन और पोषण' },
    ],
    '9-10': [
      { id: 'cell-structure', nameEn: 'The Fundamental Unit of Life', nameHi: 'जीवन की मूल इकाई' },
      { id: 'tissues', nameEn: 'Tissues', nameHi: 'ऊतक' },
      { id: 'diversity-organisms', nameEn: 'Diversity in Living Organisms', nameHi: 'जीवों में विविधता' },
      { id: 'life-processes', nameEn: 'Life Processes', nameHi: 'जैव प्रक्रियाएं' },
      { id: 'control-coordination', nameEn: 'Control and Coordination', nameHi: 'नियंत्रण और समन्वय' },
      { id: 'reproduction', nameEn: 'How do Organisms Reproduce', nameHi: 'जीव जनन कैसे करते हैं' },
      { id: 'heredity-evolution', nameEn: 'Heredity and Evolution', nameHi: 'आनुवंशिकता और जैव विकास' },
      { id: 'natural-resources', nameEn: 'Our Environment', nameHi: 'हमारा पर्यावरण' },
    ],
    '11-12': [
      { id: 'living-world', nameEn: 'The Living World', nameHi: 'जीव जगत' },
      { id: 'biological-classification', nameEn: 'Biological Classification', nameHi: 'जैविक वर्गीकरण' },
      { id: 'plant-kingdom', nameEn: 'Plant Kingdom', nameHi: 'पादप जगत' },
      { id: 'animal-kingdom', nameEn: 'Animal Kingdom', nameHi: 'प्राणि जगत' },
      { id: 'morphology-plants', nameEn: 'Morphology of Flowering Plants', nameHi: 'पुष्पी पादपों की आकृति विज्ञान' },
      { id: 'anatomy-plants', nameEn: 'Anatomy of Flowering Plants', nameHi: 'पुष्पी पादपों का शारीर' },
      { id: 'cell-biology', nameEn: 'Cell: The Unit of Life', nameHi: 'कोशिका: जीवन की इकाई' },
      { id: 'biomolecules-bio', nameEn: 'Biomolecules', nameHi: 'जैव अणु' },
      { id: 'cell-cycle', nameEn: 'Cell Cycle and Cell Division', nameHi: 'कोशिका चक्र और कोशिका विभाजन' },
      { id: 'photosynthesis', nameEn: 'Photosynthesis in Higher Plants', nameHi: 'उच्च पादपों में प्रकाश संश्लेषण' },
      { id: 'respiration-plants', nameEn: 'Respiration in Plants', nameHi: 'पादप में श्वसन' },
      { id: 'plant-growth', nameEn: 'Plant Growth and Development', nameHi: 'पादप वृद्धि और विकास' },
      { id: 'digestion-absorption', nameEn: 'Digestion and Absorption', nameHi: 'पाचन और अवशोषण' },
      { id: 'breathing-respiration', nameEn: 'Breathing and Exchange of Gases', nameHi: 'श्वसन और गैसों का विनिमय' },
      { id: 'body-fluids', nameEn: 'Body Fluids and Circulation', nameHi: 'शरीर द्रव और परिसंचरण' },
      { id: 'excretory-products', nameEn: 'Excretory Products and Elimination', nameHi: 'उत्सर्जी उत्पाद और उनका निष्कासन' },
      { id: 'locomotion-movement', nameEn: 'Locomotion and Movement', nameHi: 'गमन और संचलन' },
      { id: 'neural-control', nameEn: 'Neural Control and Coordination', nameHi: 'तंत्रिका नियंत्रण और समन्वय' },
      { id: 'chemical-coordination', nameEn: 'Chemical Coordination and Integration', nameHi: 'रासायनिक समन्वय और एकीकरण' },
      { id: 'reproduction-organisms', nameEn: 'Reproduction in Organisms', nameHi: 'जीवों में जनन' },
      { id: 'human-reproduction', nameEn: 'Human Reproduction', nameHi: 'मानव जनन' },
      { id: 'reproductive-health', nameEn: 'Reproductive Health', nameHi: 'जनन स्वास्थ्य' },
      { id: 'heredity-principles', nameEn: 'Principles of Inheritance', nameHi: 'वंशागति के सिद्धांत' },
      { id: 'molecular-inheritance', nameEn: 'Molecular Basis of Inheritance', nameHi: 'वंशागति का आणविक आधार' },
      { id: 'evolution-bio', nameEn: 'Evolution', nameHi: 'जैव विकास' },
      { id: 'human-health', nameEn: 'Human Health and Disease', nameHi: 'मानव स्वास्थ्य और रोग' },
      { id: 'microbes', nameEn: 'Microbes in Human Welfare', nameHi: 'मानव कल्याण में सूक्ष्मजीव' },
      { id: 'biotechnology-principles', nameEn: 'Biotechnology: Principles and Processes', nameHi: 'जैव प्रौद्योगिकी: सिद्धांत और प्रक्रियाएं' },
      { id: 'biotechnology-applications', nameEn: 'Biotechnology and Its Applications', nameHi: 'जैव प्रौद्योगिकी और उसके अनुप्रयोग' },
      { id: 'ecology', nameEn: 'Organisms and Populations', nameHi: 'जीव और समष्टियां' },
      { id: 'ecosystem', nameEn: 'Ecosystem', nameHi: 'पारितंत्र' },
      { id: 'biodiversity', nameEn: 'Biodiversity and Conservation', nameHi: 'जैव विविधता और संरक्षण' },
    ],
  },

  science: {
    '6-8': [
      { id: 'food-sources', nameEn: 'Food: Where Does It Come From', nameHi: 'भोजन: यह कहां से आता है' },
      { id: 'components-food', nameEn: 'Components of Food', nameHi: 'भोजन के घटक' },
      { id: 'fibre-fabric', nameEn: 'Fibre to Fabric', nameHi: 'रेशों से वस्त्र तक' },
      { id: 'sorting-materials', nameEn: 'Sorting Materials', nameHi: 'पदार्थों का पृथक्करण' },
      { id: 'changes-around', nameEn: 'Changes Around Us', nameHi: 'हमारे आस-पास के परिवर्तन' },
      { id: 'getting-know-plants', nameEn: 'Getting to Know Plants', nameHi: 'पौधों से परिचय' },
      { id: 'body-movements', nameEn: 'Body Movements', nameHi: 'शरीर में गति' },
      { id: 'living-surroundings', nameEn: 'Living Organisms and Surroundings', nameHi: 'सजीव और उनका परिवेश' },
      { id: 'motion-measurement', nameEn: 'Motion and Measurement', nameHi: 'गति और मापन' },
      { id: 'light-shadows-reflections', nameEn: 'Light, Shadows and Reflections', nameHi: 'प्रकाश, छायाएं और परावर्तन' },
      { id: 'electricity-circuits', nameEn: 'Electricity and Circuits', nameHi: 'विद्युत और परिपथ' },
      { id: 'fun-magnets', nameEn: 'Fun with Magnets', nameHi: 'चुंबकों का मज़ा' },
      { id: 'water', nameEn: 'Water', nameHi: 'जल' },
      { id: 'air-around', nameEn: 'Air Around Us', nameHi: 'हमारे चारों ओर वायु' },
    ],
    '9-10': [
      { id: 'matter-surroundings', nameEn: 'Matter in Our Surroundings', nameHi: 'हमारे आस-पास के पदार्थ' },
      { id: 'matter-pure', nameEn: 'Is Matter Around Us Pure', nameHi: 'क्या हमारे आस-पास के पदार्थ शुद्ध हैं' },
      { id: 'atoms-molecules-sci', nameEn: 'Atoms and Molecules', nameHi: 'परमाणु और अणु' },
      { id: 'cell-fundamental', nameEn: 'The Fundamental Unit of Life', nameHi: 'जीवन की मूल इकाई' },
      { id: 'tissues-sci', nameEn: 'Tissues', nameHi: 'ऊतक' },
      { id: 'motion-sci', nameEn: 'Motion', nameHi: 'गति' },
      { id: 'force-motion-laws', nameEn: 'Force and Laws of Motion', nameHi: 'बल और गति के नियम' },
      { id: 'gravitation-sci', nameEn: 'Gravitation', nameHi: 'गुरुत्वाकर्षण' },
      { id: 'work-energy-sci', nameEn: 'Work and Energy', nameHi: 'कार्य और ऊर्जा' },
      { id: 'sound-sci', nameEn: 'Sound', nameHi: 'ध्वनि' },
    ],
    '11-12': [
      { id: 'general-science', nameEn: 'General Science Topics', nameHi: 'सामान्य विज्ञान विषय' },
    ],
  },

  social: {
    '6-8': [
      { id: 'earth-globe', nameEn: 'The Earth: Our Habitat', nameHi: 'पृथ्वी: हमारा आवास' },
      { id: 'globe-latlong', nameEn: 'Globe - Latitudes and Longitudes', nameHi: 'ग्लोब - अक्षांश और देशांतर' },
      { id: 'motions-earth', nameEn: 'Motions of the Earth', nameHi: 'पृथ्वी की गतियां' },
      { id: 'maps', nameEn: 'Maps', nameHi: 'मानचित्र' },
      { id: 'major-domains', nameEn: 'Major Domains of the Earth', nameHi: 'पृथ्वी के प्रमुख परिमंडल' },
      { id: 'india-diversity', nameEn: 'India - Unity in Diversity', nameHi: 'भारत - विविधता में एकता' },
      { id: 'understanding-diversity', nameEn: 'Understanding Diversity', nameHi: 'विविधता की समझ' },
      { id: 'what-is-government', nameEn: 'What is Government', nameHi: 'सरकार क्या है' },
      { id: 'what-where-how-when', nameEn: 'What, Where, How and When', nameHi: 'क्या, कहां, कैसे और कब' },
      { id: 'earliest-societies', nameEn: 'Earliest Societies', nameHi: 'आरंभिक समाज' },
    ],
    '9-10': [
      { id: 'india-size-location', nameEn: 'India - Size and Location', nameHi: 'भारत - आकार और स्थिति' },
      { id: 'physical-features-india', nameEn: 'Physical Features of India', nameHi: 'भारत का भौतिक स्वरूप' },
      { id: 'drainage', nameEn: 'Drainage', nameHi: 'अपवाह' },
      { id: 'climate-india', nameEn: 'Climate', nameHi: 'जलवायु' },
      { id: 'natural-vegetation', nameEn: 'Natural Vegetation and Wildlife', nameHi: 'प्राकृतिक वनस्पति और वन्य प्राणी' },
      { id: 'population-india', nameEn: 'Population', nameHi: 'जनसंख्या' },
      { id: 'french-revolution', nameEn: 'French Revolution', nameHi: 'फ्रांसीसी क्रांति' },
      { id: 'socialism-europe', nameEn: 'Socialism in Europe', nameHi: 'यूरोप में समाजवाद' },
      { id: 'nazism-hitler', nameEn: 'Nazism and Rise of Hitler', nameHi: 'नाजीवाद और हिटलर का उदय' },
      { id: 'democracy-contemporary', nameEn: 'Democracy in the Contemporary World', nameHi: 'समकालीन विश्व में लोकतंत्र' },
      { id: 'constitutional-design', nameEn: 'Constitutional Design', nameHi: 'संविधान निर्माण' },
      { id: 'electoral-politics', nameEn: 'Electoral Politics', nameHi: 'चुनावी राजनीति' },
    ],
    '11-12': [
      { id: 'indian-constitution', nameEn: 'Indian Constitution', nameHi: 'भारतीय संविधान' },
      { id: 'rights-duties', nameEn: 'Rights in Indian Constitution', nameHi: 'भारतीय संविधान में अधिकार' },
      { id: 'election-representation', nameEn: 'Election and Representation', nameHi: 'चुनाव और प्रतिनिधित्व' },
      { id: 'executive', nameEn: 'Executive', nameHi: 'कार्यपालिका' },
      { id: 'legislature', nameEn: 'Legislature', nameHi: 'विधायिका' },
      { id: 'judiciary', nameEn: 'Judiciary', nameHi: 'न्यायपालिका' },
      { id: 'federalism', nameEn: 'Federalism', nameHi: 'संघवाद' },
      { id: 'local-governments', nameEn: 'Local Governments', nameHi: 'स्थानीय शासन' },
    ],
  },

  english: {
    '6-8': [
      { id: 'grammar-basics', nameEn: 'Basic Grammar', nameHi: 'मूल व्याकरण' },
      { id: 'tenses', nameEn: 'Tenses', nameHi: 'काल' },
      { id: 'parts-of-speech', nameEn: 'Parts of Speech', nameHi: 'शब्द भेद' },
      { id: 'comprehension', nameEn: 'Reading Comprehension', nameHi: 'पठन बोध' },
      { id: 'essay-writing', nameEn: 'Essay Writing', nameHi: 'निबंध लेखन' },
      { id: 'letter-writing', nameEn: 'Letter Writing', nameHi: 'पत्र लेखन' },
    ],
    '9-10': [
      { id: 'grammar-advanced', nameEn: 'Advanced Grammar', nameHi: 'उन्नत व्याकरण' },
      { id: 'tenses-advanced', nameEn: 'Tenses - Advanced', nameHi: 'काल - उन्नत' },
      { id: 'voice-narration', nameEn: 'Voice and Narration', nameHi: 'वाच्य और कथन' },
      { id: 'clauses', nameEn: 'Clauses and Sentences', nameHi: 'उपवाक्य और वाक्य' },
      { id: 'literature-prose', nameEn: 'Prose - Literature', nameHi: 'गद्य - साहित्य' },
      { id: 'literature-poetry', nameEn: 'Poetry - Literature', nameHi: 'कविता - साहित्य' },
      { id: 'writing-skills', nameEn: 'Writing Skills', nameHi: 'लेखन कौशल' },
      { id: 'notice-writing', nameEn: 'Notice and Message Writing', nameHi: 'सूचना और संदेश लेखन' },
    ],
    '11-12': [
      { id: 'grammar-mastery', nameEn: 'Grammar Mastery', nameHi: 'व्याकरण में महारत' },
      { id: 'error-correction', nameEn: 'Error Correction', nameHi: 'त्रुटि सुधार' },
      { id: 'sentence-transformation', nameEn: 'Sentence Transformation', nameHi: 'वाक्य रूपांतरण' },
      { id: 'vocabulary', nameEn: 'Vocabulary Building', nameHi: 'शब्द भंडार निर्माण' },
      { id: 'literature-12', nameEn: 'Literature - Flamingo/Vistas', nameHi: 'साहित्य - फ्लेमिंगो/विस्टाज' },
      { id: 'article-writing', nameEn: 'Article Writing', nameHi: 'लेख लेखन' },
      { id: 'report-writing', nameEn: 'Report Writing', nameHi: 'रिपोर्ट लेखन' },
      { id: 'speech-writing', nameEn: 'Speech Writing', nameHi: 'भाषण लेखन' },
    ],
  },

  hindi: {
    '6-8': [
      { id: 'hindi-vyakaran-basics', nameEn: 'Basic Hindi Grammar', nameHi: 'मूल हिंदी व्याकरण' },
      { id: 'sangya-sarvanam', nameEn: 'Noun and Pronoun', nameHi: 'संज्ञा और सर्वनाम' },
      { id: 'visheshan-kriya', nameEn: 'Adjective and Verb', nameHi: 'विशेषण और क्रिया' },
      { id: 'vakya-rachna', nameEn: 'Sentence Formation', nameHi: 'वाक्य रचना' },
      { id: 'gadya-pathya', nameEn: 'Prose Lessons', nameHi: 'गद्य पाठ' },
      { id: 'kavya-pathya', nameEn: 'Poetry Lessons', nameHi: 'काव्य पाठ' },
    ],
    '9-10': [
      { id: 'samas', nameEn: 'Samas (Compound Words)', nameHi: 'समास' },
      { id: 'sandhi', nameEn: 'Sandhi', nameHi: 'संधि' },
      { id: 'upsarg-pratyay', nameEn: 'Prefix and Suffix', nameHi: 'उपसर्ग और प्रत्यय' },
      { id: 'muhavare-lokoktiyan', nameEn: 'Idioms and Proverbs', nameHi: 'मुहावरे और लोकोक्तियां' },
      { id: 'alankar', nameEn: 'Figures of Speech', nameHi: 'अलंकार' },
      { id: 'ras', nameEn: 'Ras (Sentiment)', nameHi: 'रस' },
      { id: 'patra-lekhan', nameEn: 'Letter Writing', nameHi: 'पत्र लेखन' },
      { id: 'nibandh-lekhan', nameEn: 'Essay Writing', nameHi: 'निबंध लेखन' },
    ],
    '11-12': [
      { id: 'hindi-sahitya-itihas', nameEn: 'History of Hindi Literature', nameHi: 'हिंदी साहित्य का इतिहास' },
      { id: 'kabir-surdas', nameEn: 'Kabir and Surdas', nameHi: 'कबीर और सूरदास' },
      { id: 'tulsi-meera', nameEn: 'Tulsidas and Meera', nameHi: 'तुलसीदास और मीरा' },
      { id: 'premchand', nameEn: 'Premchand Stories', nameHi: 'प्रेमचंद की कहानियां' },
      { id: 'nagarjun-muktibodh', nameEn: 'Nagarjun and Muktibodh', nameHi: 'नागार्जुन और मुक्तिबोध' },
      { id: 'vyangya-sahitya', nameEn: 'Satirical Literature', nameHi: 'व्यंग्य साहित्य' },
      { id: 'rachnatmak-lekhan', nameEn: 'Creative Writing', nameHi: 'रचनात्मक लेखन' },
    ],
  },

  computer: {
    '6-8': [
      { id: 'computer-basics', nameEn: 'Computer Basics', nameHi: 'कंप्यूटर की मूल बातें' },
      { id: 'input-output', nameEn: 'Input and Output Devices', nameHi: 'इनपुट और आउटपुट डिवाइस' },
      { id: 'ms-word', nameEn: 'MS Word Basics', nameHi: 'MS Word की मूल बातें' },
      { id: 'ms-excel', nameEn: 'MS Excel Basics', nameHi: 'MS Excel की मूल बातें' },
      { id: 'internet-basics', nameEn: 'Internet Basics', nameHi: 'इंटरनेट की मूल बातें' },
      { id: 'scratch-programming', nameEn: 'Scratch Programming', nameHi: 'स्क्रैच प्रोग्रामिंग' },
    ],
    '9-10': [
      { id: 'python-intro', nameEn: 'Introduction to Python', nameHi: 'पायथन का परिचय' },
      { id: 'python-basics', nameEn: 'Python Basics', nameHi: 'पायथन की मूल बातें' },
      { id: 'flow-control', nameEn: 'Flow of Control', nameHi: 'नियंत्रण प्रवाह' },
      { id: 'functions-python', nameEn: 'Functions in Python', nameHi: 'पायथन में फंक्शन' },
      { id: 'lists-strings', nameEn: 'Lists and Strings', nameHi: 'सूची और स्ट्रिंग' },
      { id: 'cyber-safety', nameEn: 'Cyber Safety', nameHi: 'साइबर सुरक्षा' },
    ],
    '11-12': [
      { id: 'python-advanced', nameEn: 'Python Programming', nameHi: 'पायथन प्रोग्रामिंग' },
      { id: 'data-structures-python', nameEn: 'Data Structures in Python', nameHi: 'पायथन में डेटा स्ट्रक्चर' },
      { id: 'file-handling', nameEn: 'File Handling', nameHi: 'फाइल हैंडलिंग' },
      { id: 'database-sql', nameEn: 'Database and SQL', nameHi: 'डेटाबेस और SQL' },
      { id: 'mysql-interface', nameEn: 'MySQL Interface with Python', nameHi: 'पायथन के साथ MySQL इंटरफेस' },
      { id: 'networking', nameEn: 'Computer Networks', nameHi: 'कंप्यूटर नेटवर्क' },
      { id: 'boolean-algebra', nameEn: 'Boolean Algebra', nameHi: 'बूलियन बीजगणित' },
    ],
  },

  physical_education: {
    '6-8': [
      { id: 'physical-fitness', nameEn: 'Physical Fitness', nameHi: 'शारीरिक फिटनेस' },
      { id: 'sports-basics', nameEn: 'Sports Basics', nameHi: 'खेलों की मूल बातें' },
      { id: 'yoga-intro', nameEn: 'Introduction to Yoga', nameHi: 'योग का परिचय' },
      { id: 'hygiene-health', nameEn: 'Hygiene and Health', nameHi: 'स्वच्छता और स्वास्थ्य' },
    ],
    '9-10': [
      { id: 'physical-education-cbse', nameEn: 'Physical Education CBSE', nameHi: 'शारीरिक शिक्षा CBSE' },
      { id: 'games-sports', nameEn: 'Games and Sports', nameHi: 'खेल और खेलकूद' },
      { id: 'athletics', nameEn: 'Athletics', nameHi: 'एथलेटिक्स' },
      { id: 'yoga-asanas', nameEn: 'Yoga Asanas', nameHi: 'योगासन' },
      { id: 'first-aid', nameEn: 'First Aid', nameHi: 'प्राथमिक चिकित्सा' },
    ],
    '11-12': [
      { id: 'changing-trends', nameEn: 'Changing Trends in Sports', nameHi: 'खेलों में बदलते रुझान' },
      { id: 'olympic-movement', nameEn: 'Olympic Movement', nameHi: 'ओलंपिक आंदोलन' },
      { id: 'physical-fitness-12', nameEn: 'Physical Fitness and Wellness', nameHi: 'शारीरिक फिटनेस और कल्याण' },
      { id: 'sports-nutrition', nameEn: 'Sports and Nutrition', nameHi: 'खेल और पोषण' },
      { id: 'psychology-sports', nameEn: 'Psychology in Sports', nameHi: 'खेलों में मनोविज्ञान' },
      { id: 'training-sports', nameEn: 'Training in Sports', nameHi: 'खेलों में प्रशिक्षण' },
      { id: 'biomechanics', nameEn: 'Biomechanics and Sports', nameHi: 'जैव यांत्रिकी और खेल' },
      { id: 'yoga-lifestyle', nameEn: 'Yoga and Lifestyle', nameHi: 'योग और जीवनशैली' },
    ],
  },

  economics: {
    '9-10': [
      { id: 'story-palampur', nameEn: 'Story of Village Palampur', nameHi: 'पालमपुर गांव की कहानी' },
      { id: 'people-resources', nameEn: 'People as Resource', nameHi: 'संसाधन के रूप में लोग' },
      { id: 'poverty-challenge', nameEn: 'Poverty as a Challenge', nameHi: 'निर्धनता एक चुनौती' },
      { id: 'food-security', nameEn: 'Food Security in India', nameHi: 'भारत में खाद्य सुरक्षा' },
      { id: 'development', nameEn: 'Development', nameHi: 'विकास' },
      { id: 'sectors-economy', nameEn: 'Sectors of Indian Economy', nameHi: 'भारतीय अर्थव्यवस्था के क्षेत्र' },
      { id: 'money-credit', nameEn: 'Money and Credit', nameHi: 'मुद्रा और साख' },
      { id: 'globalisation', nameEn: 'Globalisation', nameHi: 'वैश्वीकरण' },
    ],
    '11-12': [
      { id: 'intro-economics', nameEn: 'Introduction to Economics', nameHi: 'अर्थशास्त्र का परिचय' },
      { id: 'collection-data', nameEn: 'Collection of Data', nameHi: 'आंकड़ों का संग्रह' },
      { id: 'organisation-data', nameEn: 'Organisation of Data', nameHi: 'आंकड़ों का संगठन' },
      { id: 'measures-central-tendency', nameEn: 'Measures of Central Tendency', nameHi: 'केंद्रीय प्रवृत्ति की माप' },
      { id: 'consumer-equilibrium', nameEn: 'Consumer Equilibrium', nameHi: 'उपभोक्ता संतुलन' },
      { id: 'demand-supply', nameEn: 'Demand and Supply', nameHi: 'मांग और पूर्ति' },
      { id: 'production-costs', nameEn: 'Production and Costs', nameHi: 'उत्पादन और लागत' },
      { id: 'market-forms', nameEn: 'Forms of Market', nameHi: 'बाजार के रूप' },
      { id: 'national-income', nameEn: 'National Income Accounting', nameHi: 'राष्ट्रीय आय लेखांकन' },
      { id: 'money-banking', nameEn: 'Money and Banking', nameHi: 'मुद्रा और बैंकिंग' },
      { id: 'govt-budget', nameEn: 'Government Budget', nameHi: 'सरकारी बजट' },
      { id: 'balance-payments', nameEn: 'Balance of Payments', nameHi: 'भुगतान संतुलन' },
      { id: 'indian-economy-dev', nameEn: 'Indian Economy Development', nameHi: 'भारतीय अर्थव्यवस्था का विकास' },
    ],
  },

  accountancy: {
    '11-12': [
      { id: 'intro-accounting', nameEn: 'Introduction to Accounting', nameHi: 'लेखांकन का परिचय' },
      { id: 'accounting-theory', nameEn: 'Theory Base of Accounting', nameHi: 'लेखांकन का सैद्धांतिक आधार' },
      { id: 'recording-transactions', nameEn: 'Recording of Transactions', nameHi: 'लेन-देन का अभिलेखन' },
      { id: 'journal-ledger', nameEn: 'Journal and Ledger', nameHi: 'जर्नल और खाता बही' },
      { id: 'trial-balance', nameEn: 'Trial Balance and Rectification', nameHi: 'तलपट और त्रुटि सुधार' },
      { id: 'depreciation', nameEn: 'Depreciation', nameHi: 'मूल्यह्रास' },
      { id: 'bills-exchange', nameEn: 'Bills of Exchange', nameHi: 'विनिमय पत्र' },
      { id: 'final-accounts', nameEn: 'Financial Statements', nameHi: 'वित्तीय विवरण' },
      { id: 'partnership-basics', nameEn: 'Accounting for Partnership', nameHi: 'साझेदारी लेखांकन' },
      { id: 'partnership-reconstitution', nameEn: 'Reconstitution of Partnership', nameHi: 'साझेदारी का पुनर्गठन' },
      { id: 'dissolution-partnership', nameEn: 'Dissolution of Partnership', nameHi: 'साझेदारी का विघटन' },
      { id: 'company-accounts', nameEn: 'Accounting for Share Capital', nameHi: 'अंश पूंजी के लिए लेखांकन' },
      { id: 'debentures', nameEn: 'Issue of Debentures', nameHi: 'ऋणपत्रों का निर्गम' },
      { id: 'financial-statements-company', nameEn: 'Financial Statements of Company', nameHi: 'कंपनी के वित्तीय विवरण' },
      { id: 'ratio-analysis', nameEn: 'Accounting Ratios', nameHi: 'लेखांकन अनुपात' },
      { id: 'cash-flow', nameEn: 'Cash Flow Statement', nameHi: 'नकदी प्रवाह विवरण' },
    ],
  },

  business_studies: {
    '11-12': [
      { id: 'nature-business', nameEn: 'Nature and Purpose of Business', nameHi: 'व्यवसाय की प्रकृति और उद्देश्य' },
      { id: 'forms-business', nameEn: 'Forms of Business Organisation', nameHi: 'व्यावसायिक संगठन के प्रकार' },
      { id: 'private-public', nameEn: 'Private, Public and Global Enterprises', nameHi: 'निजी, सार्वजनिक और वैश्विक उद्यम' },
      { id: 'business-services', nameEn: 'Business Services', nameHi: 'व्यावसायिक सेवाएं' },
      { id: 'emerging-modes', nameEn: 'Emerging Modes of Business', nameHi: 'व्यवसाय के उभरते तरीके' },
      { id: 'social-responsibility', nameEn: 'Social Responsibility of Business', nameHi: 'व्यवसाय की सामाजिक जिम्मेदारी' },
      { id: 'sources-finance', nameEn: 'Sources of Business Finance', nameHi: 'व्यावसायिक वित्त के स्रोत' },
      { id: 'small-business', nameEn: 'Small Business', nameHi: 'लघु व्यवसाय' },
      { id: 'internal-trade', nameEn: 'Internal Trade', nameHi: 'आंतरिक व्यापार' },
      { id: 'international-trade', nameEn: 'International Trade', nameHi: 'अंतर्राष्ट्रीय व्यापार' },
      { id: 'principles-management', nameEn: 'Principles of Management', nameHi: 'प्रबंधन के सिद्धांत' },
      { id: 'business-environment', nameEn: 'Business Environment', nameHi: 'व्यावसायिक पर्यावरण' },
      { id: 'planning', nameEn: 'Planning', nameHi: 'नियोजन' },
      { id: 'organising', nameEn: 'Organising', nameHi: 'संगठन' },
      { id: 'staffing', nameEn: 'Staffing', nameHi: 'कार्मिक प्रबंधन' },
      { id: 'directing', nameEn: 'Directing', nameHi: 'निर्देशन' },
      { id: 'controlling', nameEn: 'Controlling', nameHi: 'नियंत्रण' },
      { id: 'financial-management', nameEn: 'Financial Management', nameHi: 'वित्तीय प्रबंधन' },
      { id: 'marketing-management', nameEn: 'Marketing Management', nameHi: 'विपणन प्रबंधन' },
      { id: 'consumer-protection', nameEn: 'Consumer Protection', nameHi: 'उपभोक्ता संरक्षण' },
    ],
  },

  fine_arts: {
    '6-8': [
      { id: 'drawing-basics', nameEn: 'Drawing Basics', nameHi: 'रेखाचित्र की मूल बातें' },
      { id: 'colour-theory', nameEn: 'Colour Theory', nameHi: 'रंग सिद्धांत' },
      { id: 'craft-work', nameEn: 'Craft Work', nameHi: 'शिल्प कार्य' },
      { id: 'folk-art', nameEn: 'Folk Art of India', nameHi: 'भारत की लोक कला' },
    ],
    '9-10': [
      { id: 'elements-art', nameEn: 'Elements of Art', nameHi: 'कला के तत्व' },
      { id: 'principles-design', nameEn: 'Principles of Design', nameHi: 'डिजाइन के सिद्धांत' },
      { id: 'indian-art-history', nameEn: 'Indian Art History', nameHi: 'भारतीय कला इतिहास' },
      { id: 'still-life', nameEn: 'Still Life Drawing', nameHi: 'स्थिर जीवन चित्रण' },
      { id: 'landscape', nameEn: 'Landscape Drawing', nameHi: 'परिदृश्य चित्रण' },
    ],
    '11-12': [
      { id: 'indian-art-schools', nameEn: 'Indian Schools of Art', nameHi: 'भारतीय कला विद्यालय' },
      { id: 'miniature-paintings', nameEn: 'Miniature Paintings', nameHi: 'लघु चित्रकला' },
      { id: 'mural-paintings', nameEn: 'Mural Paintings', nameHi: 'भित्ति चित्रकला' },
      { id: 'modern-indian-art', nameEn: 'Modern Indian Art', nameHi: 'आधुनिक भारतीय कला' },
      { id: 'sculpture-indian', nameEn: 'Indian Sculpture', nameHi: 'भारतीय मूर्तिकला' },
      { id: 'contemporary-art', nameEn: 'Contemporary Indian Art', nameHi: 'समकालीन भारतीय कला' },
    ],
  },

  music: {
    '6-8': [
      { id: 'swar-saptak', nameEn: 'Swar and Saptak', nameHi: 'स्वर और सप्तक' },
      { id: 'taal-basics', nameEn: 'Taal Basics', nameHi: 'ताल की मूल बातें' },
      { id: 'bhajan-intro', nameEn: 'Introduction to Bhajan', nameHi: 'भजन का परिचय' },
      { id: 'musical-instruments', nameEn: 'Musical Instruments', nameHi: 'वाद्य यंत्र' },
    ],
    '9-10': [
      { id: 'raag-basics', nameEn: 'Basics of Raag', nameHi: 'राग की मूल बातें' },
      { id: 'taal-advanced', nameEn: 'Taal - Advanced', nameHi: 'ताल - उन्नत' },
      { id: 'bandish', nameEn: 'Bandish and Composition', nameHi: 'बंदिश और रचना' },
      { id: 'classical-music-history', nameEn: 'History of Indian Classical Music', nameHi: 'भारतीय शास्त्रीय संगीत का इतिहास' },
      { id: 'folk-music', nameEn: 'Folk Music of India', nameHi: 'भारत का लोक संगीत' },
    ],
    '11-12': [
      { id: 'raag-advanced', nameEn: 'Advanced Raag Study', nameHi: 'उन्नत राग अध्ययन' },
      { id: 'gharanas', nameEn: 'Gharanas of Indian Music', nameHi: 'भारतीय संगीत के घराने' },
      { id: 'thumri-dadra', nameEn: 'Thumri and Dadra', nameHi: 'ठुमरी और दादरा' },
      { id: 'khayal', nameEn: 'Khayal Gayaki', nameHi: 'ख्याल गायकी' },
      { id: 'music-theory', nameEn: 'Music Theory', nameHi: 'संगीत सिद्धांत' },
      { id: 'indian-instruments', nameEn: 'Indian Classical Instruments', nameHi: 'भारतीय शास्त्रीय वाद्य' },
      { id: 'music-aesthetics', nameEn: 'Aesthetics in Music', nameHi: 'संगीत में सौंदर्यशास्त्र' },
    ],
  },
};

// Export type for chapter
export type ChapterId = string;
