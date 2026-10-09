import {
  AcademicSession,
  ClassItem,
  Lesson,
  SubjectItem,
  TeachingProgress,
  Topic,
  Week,
} from '../types/lesson';

export const INITIAL_CLASSES: ClassItem[] = [
  { id: 'class-jss3', name: 'JSS 3', arm: 'Gold', level: 'Junior Secondary 3' },
  { id: 'class-jss2', name: 'JSS 2', arm: 'Silver', level: 'Junior Secondary 2' },
  { id: 'class-jss1', name: 'JSS 1', arm: 'Diamond', level: 'Junior Secondary 1' },
  { id: 'class-sss1', name: 'SSS 1', arm: 'Science', level: 'Senior Secondary 1' },
];

export const INITIAL_SUBJECTS: SubjectItem[] = [
  { id: 'sub-jss3-dt', classId: 'class-jss3', name: 'Digital Technology', code: 'DT-301' },
  { id: 'sub-jss3-bs', classId: 'class-jss3', name: 'Basic Science', code: 'BS-302' },
  { id: 'sub-jss3-mth', classId: 'class-jss3', name: 'Mathematics', code: 'MTH-303' },
  { id: 'sub-jss2-dt', classId: 'class-jss2', name: 'Digital Technology', code: 'DT-201' },
  { id: 'sub-jss2-bs', classId: 'class-jss2', name: 'Basic Science', code: 'BS-202' },
  { id: 'sub-jss1-dt', classId: 'class-jss1', name: 'Digital Technology', code: 'DT-101' },
  { id: 'sub-jss1-bs', classId: 'class-jss1', name: 'Basic Science', code: 'BS-102' },
  { id: 'sub-sss1-cs', classId: 'class-sss1', name: 'Computer Science', code: 'CS-401' },
];

export const DEFAULT_TERM_LABEL = 'First Term';
export const DEFAULT_TERM_NUMBER = 1;
export const DEFAULT_TOTAL_WEEKS = 14;

/** One academic session (term) per subject. */
export const INITIAL_SESSIONS: AcademicSession[] = INITIAL_SUBJECTS.map((subject) => ({
  id: `sess-${subject.id}-t${DEFAULT_TERM_NUMBER}`,
  subjectId: subject.id,
  term: DEFAULT_TERM_NUMBER,
  label: DEFAULT_TERM_LABEL,
  totalWeeks: DEFAULT_TOTAL_WEEKS,
  currentWeek: 1,
}));

/** Weeks are term structure, not content: generate them per session. */
export const INITIAL_WEEKS: Week[] = INITIAL_SESSIONS.flatMap((session) =>
  Array.from({ length: session.totalWeeks }, (_, index) => ({
    id: `wk-${session.id}-${String(index + 1).padStart(2, '0')}`,
    sessionId: session.id,
    number: index + 1,
  })),
);

/**
 * Topics are first-class planning entities: Week → Topic → Lesson.
 * One topic per week for the seeded JSS 3 Digital Technology term start.
 */
export const INITIAL_TOPICS: Topic[] = [
  {
    id: 'topic-sub-jss3-dt-w1-01',
    weekId: 'wk-sess-sub-jss3-dt-t1-01',
    title: 'Review of JSS 2 Work – Programming and Robotics',
    order: 1,
  },
  {
    id: 'topic-sub-jss3-dt-w2-01',
    weekId: 'wk-sess-sub-jss3-dt-t1-02',
    title: 'Digital Media, Data Representations, and Everyday Algorithms',
    order: 1,
  },
  {
    id: 'topic-sub-jss3-dt-w3-01',
    weekId: 'wk-sess-sub-jss3-dt-t1-03',
    title: 'Introduction to Python & Scripting Syntax',
    order: 1,
  },
  {
    id: 'topic-sub-jss3-dt-w4-01',
    weekId: 'wk-sess-sub-jss3-dt-t1-04',
    title: 'Robotics Sensors, Microcontrollers, and Actuators',
    order: 1,
  },
];

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'lesson-jss3-dt-w1',
    topicId: 'topic-sub-jss3-dt-w1-01',
    title: 'Programming and Robotics Review',
    durationMinutes: 45,
    learningObjectives: [
      'Recall the meaning and purpose of computer programming.',
      'Explain what an algorithm is using everyday relatable analogies.',
      'Identify and describe the four basic programming concepts (Sequencing, Selection, Iteration, Variables).',
      'Describe what robotics is and how machines interact with physical environments.',
      'Give concrete real-world examples of modern robots in manufacturing, medicine, and space.',
    ],
    materials: [
      'Classroom Whiteboard and dry-erase markers',
      'Robot photographic reference plates',
      'Algorithm flowchart visual diagram',
      'Block-coding interactive environment demonstration',
      'Physical breadboard / simple motor sample (optional)',
    ],
    priorKnowledge: 'JSS 2 Term 3 core: what a program is, basic algorithms, parts of a robot.',
    teacherNotes:
      'Revision of JSS 2 Term 3 Core Curriculum. Bridge JSS 2 definitions to JSS 3 Python and micro-controller work. Next week: Week 2 — Digital Media, Data Representations, and Algorithms in Everyday Life.',
    studentNotes: [
      '# Review of JSS 2 Work – Programming and Robotics',
      '',
      '## 1. Meaning of Computer Programming',
      'Computer Programming is the process of writing, testing, and maintaining step-by-step instructions (source code) that tell a computer how to perform a task.',
      '- A person who writes programs is a Programmer or Software Developer.',
      '- Computers only understand machine language (binary 0s and 1s).',
      '- Languages (Scratch, Python, C++) bridge human logic and circuits.',
      '',
      '## 2. The Concept of Algorithm',
      'An Algorithm is a finite, ordered sequence of unambiguous instructions designed to solve a problem.',
      '- Clear, finite, sequential. Example: making tea, crossing the road safely.',
      '',
      '## 3. Four Fundamental Programming Concepts',
      '- Sequencing, Selection (IF/THEN/ELSE), Iteration (loops), Variables.',
      '',
      '## 4. Robotics – Sense, Think, Act',
      '- SENSE (sensors) -> THINK (processor) -> ACT (actuators).',
      '- Examples: industrial arms, Mars rovers, surgical robotics.',
      '',
      'Key Takeaway: An algorithm is the logical recipe; programming translates that recipe into language a machine can execute; robotics embeds those programs into mechanical bodies.',
    ].join('\n'),
    resources: [
      {
        id: 'res-hook-sandwich',
        type: 'link',
        title: 'Classic Exact Instructions Robot Challenge (Teaching Video)',
        description: 'Why literal algorithmic thinking is essential for children learning programming.',
        url: 'https://en.wikipedia.org/wiki/Algorithm',
        linkDomain: 'wikipedia.org',
      },
      {
        id: 'res-block-demo',
        type: 'image',
        title: 'Block-Based Coding Visual Architecture',
        description: 'How logic blocks snap together to control a character or motor.',
        url: '/src/assets/images/block_coding_demo_1790536378641.jpg',
        caption: 'Fig. 1 — Visual block-based code connecting sequential movements and loops.',
      },
      {
        id: 'res-algo-flowchart',
        type: 'image',
        title: 'Standard Educational Algorithm Flowchart',
        description: 'Start, input, actions, decision condition, and output.',
        url: '/src/assets/images/algorithm_flowchart_card_1790536362403.jpg',
        caption: 'Fig. 2 — Step-by-step algorithm flowchart showing execution paths.',
      },
      {
        id: 'res-robot-arm',
        type: 'image',
        title: 'Precision Industrial Assembly Robotic Arm',
        description: 'Multi-axis articulation, servo actuators, and gripper in manufacturing.',
        url: '/src/assets/images/industrial_robot_arm_1790536351917.jpg',
        caption: 'Fig. 3 — Multi-axis precision industrial robot in assembly.',
      },
    ],
    sections: [
      {
        id: 'sec-1',
        title: 'Set Induction / Hook',
        durationMinutes: 6,
        content:
          'Call on a volunteer to instruct you (a literal robot) how to make a sandwich or pour water. Follow instructions with hyper-literal precision. Debrief: why did the robot fail? Concepts: literal execution, order matters, eliminating ambiguity.',
        teacherGuidance:
          'Say to class: "Computers do not guess what you meant. They execute precisely what you told them to do."\nCall on a volunteer. Follow instructions literally for effect. Debrief with the class.',
      },
      {
        id: 'sec-2',
        title: 'Introduction of Topic',
        durationMinutes: 2,
        content:
          'Write the title on the board. Explain why the review matters for JSS 3 Python and micro-controllers. Point to the 5 learning objectives.',
        teacherGuidance:
          'Say to class: "Today we bridge what we learned in JSS 2 with the hands-on projects waiting for us this term."\nWrite the title. State objectives.',
      },
      {
        id: 'sec-3a',
        title: 'Meaning of Programming',
        durationMinutes: 4,
        content:
          'Programming is authoring step-by-step instructions hardware can execute. Hardware understands binary; languages (Scratch, Python, C++) bridge human logic to circuits. Key concepts: definition of programming, programmer role, block vs textual languages.',
        teacherGuidance:
          'Say to class: "Does the computer understand English? No. A program is the translator."\nDefine programming. Show the block-coding graphic.',
      },
      {
        id: 'sec-3b',
        title: 'Algorithm',
        durationMinutes: 4,
        content:
          'An algorithm is a finite, unambiguous sequence of steps to solve a problem — it exists before any code. Characteristics: finiteness, definiteness, inputs/outputs. Examples: recipes, traffic lights, ATM steps. Flowchart: Start, Process, Decision, End.',
        teacherGuidance:
          'Say to class: "An algorithm is the logic recipe. If your recipe is broken, no language can save your program."\nWrite ALGORITHM on the board. Collect morning-routine examples. Show the flowchart.',
      },
      {
        id: 'sec-3c',
        title: 'Four Basic Programming Concepts',
        durationMinutes: 8,
        content:
          'Sequencing (top-to-bottom order), Selection (IF/ELSE decisions), Iteration (WHILE/FOR loops), Variables (named memory). Every program — from WhatsApp to autopilot — uses these four blocks.',
        teacherGuidance:
          'Say to class: "Every program ever built is constructed from these four building blocks."\nDraw four quadrants. Have students chant the four names.',
        activity: 'Students shout the four concepts in unison and give one example each.',
      },
      {
        id: 'sec-3d',
        title: 'Robotics',
        durationMinutes: 6,
        content:
          'Robotics triad: SENSE → THINK → ACT. Sensors, microcontroller, actuators. Contrast appliances vs true robots. Domains: industrial, medical, domestic, scientific (assembly arms, da Vinci surgery, Mars rovers).',
        teacherGuidance:
          'Say to class: "A fan spins when on. A robot senses, decides, and acts."\nTeach the triad. Display the robotic arm plate.',
      },
      {
        id: 'sec-4',
        title: 'Student Notes',
        durationMinutes: 5,
        content: 'Students open exercise books, rule margins, and copy the structured notes including the Sense-Think-Act diagram. Teacher walks aisles for 5 minutes.',
        teacherGuidance:
          'Say to class: "Pens in hand. Subject, Topic, Date, Class at the top."\nProject the notes. Allow focused copying time.',
      },
      {
        id: 'sec-5',
        title: 'Evaluation',
        durationMinutes: 4,
        content: 'Rapid oral and board-check across all 5 objectives. Reinforce algorithm vs program difference.',
        teacherGuidance:
          'Say to class: "Close notebooks for the first three questions!"\nCall on different rows. Demand key terminology.',
      },
      {
        id: 'sec-6',
        title: 'Conclusion & Assignment',
        durationMinutes: 2,
        content: 'Summarise: programming gives logic, algorithms the recipe, robotics the body. Assign homework. Preview Week 2.',
        teacherGuidance:
          'Say to class: "Great work today. Next week we look at digital media!"\nWrite the due date on the board.',
      },
    ],
    evaluation: [
      {
        id: 'eval-1',
        questionNumber: 1,
        question: 'What is the fundamental difference between an algorithm and a computer program?',
        expectedAnswer: 'An algorithm is a conceptual recipe; a program is that recipe translated into syntax a machine can execute.',
        type: 'oral',
      },
      {
        id: 'eval-2',
        questionNumber: 2,
        question: 'List the four core building blocks of computer programming.',
        expectedAnswer: 'Sequencing, Selection, Iteration (Loops), and Variables.',
        type: 'oral',
      },
      {
        id: 'eval-3',
        questionNumber: 3,
        question: 'What happens if a robot meets out-of-order instructions?',
        expectedAnswer: 'Literal execution causes errors, wrong outputs, or physical failures.',
        type: 'written',
      },
      {
        id: 'eval-4',
        questionNumber: 4,
        question: 'Describe the Sense, Think, Act triad with one example of each.',
        expectedAnswer: 'Sense: sensors (ultrasonic); Think: microcontroller; Act: motors.',
        type: 'oral',
      },
      {
        id: 'eval-5',
        questionNumber: 5,
        question: 'Name three fields where robotics is used today.',
        expectedAnswer: 'Manufacturing, space exploration, healthcare.',
        type: 'written',
      },
    ],
  },
  {
    id: 'lesson-jss3-dt-w2',
    topicId: 'topic-sub-jss3-dt-w2-01',
    title: 'Digital Media and Data Representation',
    durationMinutes: 45,
    learningObjectives: [
      'Understand how analog information is digitised into binary data.',
      'Explain the difference between vector and bitmap raster images.',
      'Trace everyday algorithms in search and recommendation feeds.',
    ],
    materials: [
      'Digital projector or tablet display',
      'Sample pixelated image zoom sheets',
      'Graph paper for pixel grid exercise',
    ],
    priorKnowledge: 'Binary idea from Week 1; what pixels are.',
    studentNotes: [
      '# Digital Media and Data Representations',
      '',
      '## 1. What is Digital Media?',
      'Digitised content (audio, video, text, images) processed by digital systems.',
      '',
      '## 2. Raster vs Vector',
      'Raster = fixed pixel grid (JPEG/PNG). Vector = maths coordinates (SVG), scales infinitely.',
      '',
      'Key Takeaway: All digital media is binary numbers in memory.',
    ].join('\n'),
    sections: [
      {
        id: 'sec-w2-1',
        title: 'Set Induction / Hook',
        durationMinutes: 5,
        content: 'Show a photo zoomed to 800% until pixels appear. Ask how screens fool eyes into smooth faces. Answer: grids of coloured numbers.',
        teacherGuidance: 'Say to class: "Every picture on your phone is a grid of coloured numbers."\nShow the zoomed photo.',
      },
      {
        id: 'sec-w2-2',
        title: 'Binary Representation of Colours',
        durationMinutes: 10,
        content: 'RGB mixing. 8 bits = 256 levels per channel.',
        teacherGuidance: 'Explain RGB. Demo 8-bit intensity levels.',
      },
      {
        id: 'sec-w2-3',
        title: 'Vector vs Raster Graphics',
        durationMinutes: 12,
        content: 'Contrast SVG maths formulas vs JPEG/PNG pixels. Demo infinite scaling.',
        teacherGuidance: 'Contrast vector and raster. Demo scaling.',
      },
      {
        id: 'sec-w2-4',
        title: 'Student Notes & Practical Grid Drawing',
        durationMinutes: 8,
        content: 'Copy notes and complete a 5x5 pixel bitmap grid.',
        teacherGuidance: 'Direct copying and the grid exercise.',
        activity: 'Draw a 5x5 pixel bitmap in exercise books.',
      },
      {
        id: 'sec-w2-5',
        title: 'Evaluation & Weekly Assignment',
        durationMinutes: 5,
        content: 'Three rapid-fire questions on RGB depth and pixelation.',
        teacherGuidance: 'Ask 3 rapid-fire questions.',
      },
    ],
    evaluation: [
      {
        id: 'eval-w2-1',
        questionNumber: 1,
        question: 'What does RGB stand for?',
        expectedAnswer: 'Red, Green, Blue.',
        type: 'oral',
      },
    ],
  },
  {
    id: 'lesson-jss3-dt-w3',
    topicId: 'topic-sub-jss3-dt-w3-01',
    title: 'First Steps in Python',
    durationMinutes: 45,
    learningObjectives: [
      'Write the first print() statement in Python.',
      'Understand variable assignment and data types (integer, string, float).',
      'Execute code and interpret error messages calmly.',
    ],
    materials: ['Computer lab or interactive whiteboard with Python repl'],
    priorKnowledge: 'Sequencing, variables, and algorithms from Weeks 1–2.',
    studentNotes: [
      '# Introduction to Python Scripting',
      '',
      '## 1. Python Fundamentals',
      'Python is a high-level, interpreted language known for clean syntax.',
      '',
      'Key Takeaway: Python powers much of AI and automation.',
    ].join('\n'),
    sections: [
      {
        id: 'sec-w3-1',
        title: 'Introduction to Python Syntax',
        durationMinutes: 10,
        content: 'Guido van Rossum and readability philosophy. First print() and variables.',
        teacherGuidance: 'Introduce Python philosophy. Live-code print() and variables.',
        activity: 'Students write 4 lines declaring name, age, class, favourite subject.',
      },
    ],
    evaluation: [],
  },
  {
    id: 'lesson-jss3-dt-w4',
    topicId: 'topic-sub-jss3-dt-w4-01',
    title: 'Sensors, Microcontrollers, and Actuators',
    durationMinutes: 45,
    learningObjectives: [
      'Differentiate between digital and analog sensor readings.',
      'Identify microcontroller parts (CPU, RAM, GPIO pins).',
      'Explain how servo motors achieve precise positioning.',
    ],
    materials: ['Arduino / micro:bit board demo kit', 'Ultrasonic sensor module'],
    priorKnowledge: 'Sense-Think-Act triad from Week 1.',
    studentNotes: [
      '# Robotics Sensors and Microcontrollers',
      '',
      '## 1. Sensor Types',
      'Sensors convert physical phenomena into electrical signals.',
      '',
      'Key Takeaway: Microcontrollers read sensors and drive actuators.',
    ].join('\n'),
    sections: [
      {
        id: 'sec-w4-1',
        title: 'Sensors: The Sense Organs of Machines',
        durationMinutes: 12,
        content: 'Ultrasonic sensor demo. Bat echolocation analogy.',
        teacherGuidance: 'Pass around the sensor. Ask how bats navigate.',
      },
    ],
    evaluation: [],
  },
];

export const INITIAL_PROGRESS: TeachingProgress[] = [
  {
    lessonId: 'lesson-jss3-dt-w1',
    status: 'in_progress',
    currentSectionId: 'sec-3b',
    completedSectionIds: ['sec-1', 'sec-2', 'sec-3a'],
    lastVisitedAt: new Date().toISOString(),
  },
  {
    lessonId: 'lesson-jss3-dt-w2',
    status: 'planned',
    currentSectionId: 'sec-w2-1',
    completedSectionIds: [],
  },
  {
    lessonId: 'lesson-jss3-dt-w3',
    status: 'planned',
    currentSectionId: 'sec-w3-1',
    completedSectionIds: [],
  },
  {
    lessonId: 'lesson-jss3-dt-w4',
    status: 'planned',
    currentSectionId: 'sec-w4-1',
    completedSectionIds: [],
  },
];
