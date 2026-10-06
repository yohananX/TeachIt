import {
  AcademicSession,
  Lesson,
  LessonStatus,
  SubjectItem,
  ClassItem,
  TeachingProgress,
  Topic,
  Week,
} from '../types/lesson';

export const INITIAL_CLASSES: ClassItem[] = [
  { id: 'class-jss3', name: 'JSS 3', arm: 'Gold', level: 'Junior Secondary 3', subjectCount: 3 },
  { id: 'class-jss2', name: 'JSS 2', arm: 'Silver', level: 'Junior Secondary 2', subjectCount: 2 },
  { id: 'class-jss1', name: 'JSS 1', arm: 'Diamond', level: 'Junior Secondary 1', subjectCount: 2 },
  { id: 'class-sss1', name: 'SSS 1', arm: 'Science', level: 'Senior Secondary 1', subjectCount: 2 },
];

export const INITIAL_SUBJECTS: SubjectItem[] = [
  { id: 'sub-jss3-dt', classId: 'class-jss3', name: 'Digital Technology', code: 'DT-301', department: 'Computer Studies' },
  { id: 'sub-jss3-bs', classId: 'class-jss3', name: 'Basic Science', code: 'BS-302', department: 'Integrated Sciences' },
  { id: 'sub-jss3-mth', classId: 'class-jss3', name: 'Mathematics', code: 'MTH-303', department: 'Mathematics' },
  { id: 'sub-jss2-dt', classId: 'class-jss2', name: 'Digital Technology', code: 'DT-201', department: 'Computer Studies' },
  { id: 'sub-jss2-bs', classId: 'class-jss2', name: 'Basic Science', code: 'BS-202', department: 'Integrated Sciences' },
  { id: 'sub-jss1-dt', classId: 'class-jss1', name: 'Digital Technology', code: 'DT-101', department: 'Computer Studies' },
  { id: 'sub-jss1-bs', classId: 'class-jss1', name: 'Basic Science', code: 'BS-102', department: 'Integrated Sciences' },
  { id: 'sub-sss1-cs', classId: 'class-sss1', name: 'Computer Science', code: 'CS-401', department: 'Computer Studies' },
];

export const DEFAULT_TERM_LABEL = 'First Term';
export const DEFAULT_TERM_NUMBER = 1;
export const DEFAULT_TOTAL_WEEKS = 14; // matches the lesson editor's week range

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
 * Transitional shape: a lesson as authored before Phase 1, carrying its
 * teaching progress inline. Kept only so seed data and any browser still
 * holding pre-Phase-1 lessons can be split cleanly. Remove with the migration
 * once all stored data is known to be current.
 */
export interface LegacyLesson extends Lesson {
  term?: number;
  status?: LessonStatus;
  currentSectionId?: string;
  completedSectionIds?: string[];
  lastVisitedTimestamp?: string;
}

/** Split a (possibly legacy) lesson into lesson content + its progress record. */
export function splitLegacyLesson(legacy: LegacyLesson): {
  lesson: Lesson;
  progress: TeachingProgress;
} {
  const { term, status, currentSectionId, completedSectionIds, lastVisitedTimestamp, ...lesson } = legacy;
  return {
    lesson,
    progress: {
      lessonId: lesson.id,
      status: status ?? 'planned',
      currentSectionId: currentSectionId ?? lesson.sections[0]?.id ?? null,
      completedSectionIds: completedSectionIds ?? [],
      lastVisitedAt: lastVisitedTimestamp,
    },
  };
}

/**
 * Derive the Week → Topic layer from lessons. All lessons landing in the same
 * week of the same subject become one topic with several lessonIds (the 1:N
 * relation), which is how existing data and future imports are threaded into
 * the hierarchy without hand-writing topic records.
 */
export function buildTopicsFromLessons(
  lessons: Lesson[],
  sessions: AcademicSession[],
  weeks: Week[],
): Topic[] {
  const sessionBySubject = new Map(sessions.map((s) => [s.subjectId, s]));
  const weekIdBySessionAndNumber = new Map(
    weeks.map((w) => [`${w.sessionId}:${w.number}`, w.id]),
  );

  const topics: Topic[] = [];
  const topicIdByWeekId = new Map<string, string>();

  for (const lesson of lessons) {
    const session = sessionBySubject.get(lesson.subjectId);
    const weekId = session
      ? weekIdBySessionAndNumber.get(`${session.id}:${lesson.week}`)
      : undefined;
    if (!weekId) continue; // lesson outside the seeded term: attach when its week exists

    const existingTopicId = topicIdByWeekId.get(weekId);
    const existingTopic = existingTopicId
      ? topics.find((t) => t.id === existingTopicId)
      : undefined;

    if (existingTopic) {
      if (!existingTopic.lessonIds.includes(lesson.id)) {
        existingTopic.lessonIds.push(lesson.id);
      }
      continue;
    }

    const topic: Topic = {
      id: `topic-${lesson.id}`,
      weekId,
      title: lesson.topic,
      order: topics.filter((t) => t.weekId === weekId).length + 1,
      lessonIds: [lesson.id],
    };
    topicIdByWeekId.set(weekId, topic.id);
    topics.push(topic);
  }

  return topics;
}

const SEEDED_LESSONS: LegacyLesson[] = [
  {
    id: 'lesson-jss3-dt-w1',
    classId: 'class-jss3',
    className: 'JSS 3',
    subjectId: 'sub-jss3-dt',
    subjectName: 'Digital Technology',
    week: 1,
    term: 1,
    topic: 'Review of JSS 2 Work – Programming and Robotics',
    durationMinutes: '40–45 minutes',
    status: 'in_progress',
    isRevision: true,
    revisionReference: 'Revision of JSS 2 Term 3 Core Curriculum',
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
    currentSectionId: 'sec-3b', // As in specification: Teacher was at 3B. Algorithm!
    completedSectionIds: ['sec-1', 'sec-2', 'sec-3a'],
    lastVisitedTimestamp: new Date().toISOString(),
    sections: [
      {
        id: 'sec-1',
        sectionNumber: '1',
        title: 'Set Induction / Hook',
        suggestedDurationMinutes: 6,
        teacherGuidance: [
          'Call upon a student volunteer to stand up and instruct you on how to make a peanut butter sandwich or pour a clean glass of water from a jug.',
          'Instruct the student: "You are the programmer, and I am a mechanical robot with zero human common sense."',
          'Follow their instructions with humorous, hyper-literal precision: if they say "open the jar", do not use your fingers or say "which hand? how much torque?". If they say "pour water", start pouring without placing the cup underneath.',
          'Debrief with the entire classroom: ask why the robot failed despite having physical capability.',
        ],
        teacherQuote: 'Computers do not guess what you meant. They execute precisely what you told them to do, in the exact sequence you provided.',
        keyPoints: [
          'Literal execution of machine instructions',
          'Sequential dependency (step order matters)',
          'Eliminating ambiguity in instructions',
        ],
        resources: [
          {
            id: 'res-hook-sandwich',
            type: 'link',
            title: 'Classic Exact Instructions Robot Challenge (Teaching Video)',
            description: 'Educational demonstration showing why literal algorithmic thinking is essential for children learning programming.',
            url: 'https://en.wikipedia.org/wiki/Algorithm',
            linkDomain: 'wikipedia.org',
          },
        ],
      },
      {
        id: 'sec-2',
        sectionNumber: '2',
        title: 'Introduction of Topic',
        suggestedDurationMinutes: 2,
        teacherGuidance: [
          'Write the lesson title clearly across the upper board: "Review of JSS 2 Work – Programming and Robotics".',
          'Briefly explain why this review matters: in JSS 3, students will be building real programs in Python and wiring physical micro-controllers, so these foundational definitions must be second nature.',
          'Direct students to note the 5 learning objectives stated on the board.',
        ],
        teacherQuote: 'Today we bridge what we learned in JSS 2 with the hands-on engineering projects waiting for us this term.',
        keyPoints: [
          'Reconnecting foundational knowledge from JSS 2',
          'Setting clear student expectations for today’s evaluation',
        ],
      },
      {
        id: 'sec-3a',
        sectionNumber: '3A',
        groupTitle: 'Teaching / Development',
        title: 'Meaning of Programming',
        suggestedDurationMinutes: 4,
        isKeyTeachingPoint: true,
        teacherGuidance: [
          'Define programming on the board: the process of authoring step-by-step instructions that a computer hardware system can interpret and execute.',
          'Remind students that hardware only understands electrical charges (binary zeros and ones: 0 and 1).',
          'Explain that programming languages (Scratch, Python, JavaScript, C++) act as high-level bridges so humans can think in logic while the machine processes numbers.',
          'Show the block-coding demonstration graphic to demonstrate how logic blocks translate into actions.',
        ],
        teacherQuote: 'Who here remembers: does the computer understand English? No. It understands high and low voltage. A program is the translator.',
        keyPoints: [
          'Definition: Programming is writing instructions for a machine to solve a problem or automate a task.',
          'The author is called a Programmer or Software Developer.',
          'Languages range from visual block code (Scratch) to textual syntax (Python).',
        ],
        studentNoteSnippet: 'Programming is the process of designing and writing instructions (code) for a computer or digital device to execute a specific task or solve a defined problem. A person who writes programs is a Programmer.',
        resources: [
          {
            id: 'res-block-demo',
            type: 'image',
            title: 'Block-Based Coding Visual Architecture',
            description: 'Visual demonstration showing how algorithmic logic blocks snap together to control an on-screen character or robotic motor.',
            url: '/src/assets/images/block_coding_demo_1790536378641.jpg',
            caption: 'Fig. 1 — Visual block-based code connecting sequential movements and loops.',
          },
        ],
      },
      {
        id: 'sec-3b',
        sectionNumber: '3B',
        groupTitle: 'Teaching / Development',
        title: 'Algorithm',
        suggestedDurationMinutes: 4,
        isKeyTeachingPoint: true,
        teacherGuidance: [
          'Write the word ALGORITHM in bold print in the center of the board.',
          'Ask the class: "Can you think of something you do every morning that has to happen in a particular order?"',
          'Collect 2 quick student answers (e.g., putting on socks before shoes, boiling tea before pouring milk).',
          'Highlight the essential rule: an algorithm exists BEFORE writing a single line of code in any computer language.',
          'Show the flowchart diagram: point out Start, Process, Decision Diamond, and End nodes.',
        ],
        teacherQuote: 'An algorithm is not code yet. An algorithm is the logic recipe. If your recipe is broken, no computer language on earth can save your program.',
        keyPoints: [
          'Definition: A finite, unambiguous sequence of steps designed to solve a problem.',
          'Characteristics: Finiteness (must end), Definiteness (each step is crystal clear), Inputs and Outputs.',
          'Everyday examples: Recipes, traffic light cycles, making tea, ATM cash withdrawal steps.',
        ],
        studentNoteSnippet: 'An algorithm is a step-by-step procedure or set of rules to solve a specific problem or complete a task. Characteristics: Clear, Unambiguous, Finite, Sequential. Examples: Making a cup of tea, crossing a road safely, calculating student average score.',
        resources: [
          {
            id: 'res-algo-flowchart',
            type: 'image',
            title: 'Standard Educational Algorithm Flowchart',
            description: 'Flowchart diagram showing start terminator, input stage, sequential actions, decision condition, and terminal output.',
            url: '/src/assets/images/algorithm_flowchart_card_1790536362403.jpg',
            caption: 'Fig. 2 — Step-by-step algorithm flowchart showing execution paths and decision points.',
          },
        ],
      },
      {
        id: 'sec-3c',
        sectionNumber: '3C',
        groupTitle: 'Teaching / Development',
        title: 'Four Basic Programming Concepts',
        suggestedDurationMinutes: 8,
        isKeyTeachingPoint: true,
        teacherGuidance: [
          'Draw four distinct quadrants or pillars on the whiteboard to anchor student memory:',
          '1. Sequencing: The strict top-to-bottom order in which commands run.',
          '2. Selection: Making decisions based on conditions (e.g., IF temperature > 37°C THEN sound alarm ELSE display normal).',
          '3. Iteration (Loops): Repeating instructions until a goal is met (e.g., WHILE battery < 100%, keep charging).',
          '4. Variables: Named memory containers that hold values that can change over time (e.g., score = score + 10).',
          'Have students shout out the names of all four concepts in unison.',
        ],
        teacherQuote: 'Every program ever built—from WhatsApp to the autopilot on a Boeing 787—is constructed entirely from these four building blocks.',
        keyPoints: [
          'Sequencing (Order)',
          'Selection (Decisions / Branches)',
          'Iteration (Repetition / Loops)',
          'Variables (Dynamic Memory Containers)',
        ],
        studentNoteSnippet: 'The Four Fundamental Programming Concepts: 1. Sequencing (sequential execution from top to bottom), 2. Selection (conditional branch using IF/THEN/ELSE), 3. Iteration (repeating steps using loops), 4. Variables (named storage containers holding changeable data).',
      },
      {
        id: 'sec-3d',
        sectionNumber: '3D',
        groupTitle: 'Teaching / Development',
        title: 'Robotics',
        suggestedDurationMinutes: 6,
        isKeyTeachingPoint: true,
        teacherGuidance: [
          'Ask the classroom: "Is a toaster a robot? Is an electric fan a robot? What transforms a simple automated machine into a true robot?"',
          'Teach the triad: SENSE → THINK → ACT.',
          '1. SENSORS (Eyes/Nose/Skin): Ultrasound, infrared, light sensors, temperature.',
          '2. CONTROLLER (Brain): Microcontroller chip running the programmed algorithm.',
          '3. ACTUATORS (Muscles): Electric motors, hydraulic joints, pneumatic grippers, robotic wheels.',
          'Open and display the industrial robotic arm photographic plate.',
          'Highlight real-world examples: car assembly factories, da Vinci robotic surgery, warehouse parcel sorting (Amazon), NASA Mars rovers.',
        ],
        teacherQuote: 'A fan simply spins when power is on. A robot senses the room temperature, decides whether to turn on, adjusts its speed, and rotates to face people.',
        keyPoints: [
          'Sense, Think, Act cycle',
          'Difference between ordinary automated appliance vs intelligent robot',
          'Industrial, medical, domestic, and scientific robot domains',
        ],
        studentNoteSnippet: 'Robotics is the interdisciplinary branch of engineering and computer science that involves the design, construction, operation, and programming of robots. Triad: SENSE (sensors) -> THINK (processor) -> ACT (actuators). Examples: Industrial welding arms, Mars rovers, surgical robotics.',
        resources: [
          {
            id: 'res-robot-arm',
            type: 'image',
            title: 'Precision Industrial Assembly Robotic Arm',
            description: 'Photographic plate showing multi-axis articulation, electrical servo actuators, and automated precision gripper in modern manufacturing.',
            url: '/src/assets/images/industrial_robot_arm_1790536351917.jpg',
            caption: 'Fig. 3 — Multi-axis precision industrial robot performing coordinated assembly.',
          },
        ],
      },
      {
        id: 'sec-4',
        sectionNumber: '4',
        title: 'Student Notes',
        suggestedDurationMinutes: 5,
        teacherGuidance: [
          'Direct students to open their physical exercise books and rule their margins.',
          'Write down or project the structured student notes.',
          'Walk down the classroom aisles checking that students copy the four concepts clearly and note down the tea-making algorithm.',
          'Provide 5 minutes of focused classroom note-taking.',
        ],
        teacherQuote: 'Pens in hand. Check the top of your page: Subject, Topic, Date, Class. Write cleanly and legibly.',
        keyPoints: [
          'Allow students time to record accurate definitions in their exercise books',
          'Encourage students to draw the simple 3-box Sense-Think-Act diagram',
        ],
      },
      {
        id: 'sec-5',
        sectionNumber: '5',
        title: 'Evaluation',
        suggestedDurationMinutes: 4,
        teacherGuidance: [
          'Conduct a rapid oral and board-check evaluation. Call on different rows of students to ensure whole-class comprehension.',
          'Do not settle for half answers; prompt them to expand using the key terminology learned today.',
        ],
        teacherQuote: 'Let us see who was paying sharp attention. Close your notebooks for the first three questions!',
        keyPoints: [
          'Check understanding across all 5 learning objectives',
          'Reinforce difference between algorithm and program',
        ],
      },
      {
        id: 'sec-6',
        sectionNumber: '6',
        title: 'Conclusion & Assignment',
        suggestedDurationMinutes: 2,
        teacherGuidance: [
          'Summarize today’s review in two sentences: programming gives computers logic, algorithms provide the recipe, and robotics puts that code into physical machines.',
          'Assign the take-home exercise and write the due date on the assignment corner of the whiteboard.',
          'Announce next week’s topic: "Week 2 — Digital Media, Data Representations, and Algorithms in Everyday Life".',
        ],
        teacherQuote: 'Great work today, class. Next week we take our first look at digital media representations!',
        keyPoints: [
          'Clear wrap-up and preview of next week',
          'Concrete homework instructions recorded by all students',
        ],
      },
    ],
    studentNote: {
      subject: 'Digital Technology',
      topic: 'Review of JSS 2 Work – Programming and Robotics',
      className: 'JSS 3',
      term: 'First Term',
      week: 1,
      sections: [
        {
          heading: '1. Meaning of Computer Programming',
          subheading: 'Definition & Core Purpose',
          content: 'Computer Programming is the process of writing, testing, and maintaining step-by-step instructions (known as source code) that tell a computer or electronic machine how to perform a specific task or solve a computational problem.',
          bulletPoints: [
            'A person who writes computer programs is called a Programmer or Software Developer.',
            'Computers only understand machine language (binary 0s and 1s).',
            'Programming languages (e.g. Scratch, Python, HTML/JS, C++) serve as a bridge between human logic and electronic circuits.',
          ],
        },
        {
          heading: '2. The Concept of Algorithm',
          subheading: 'Definition & Characteristics',
          content: 'An Algorithm is a finite, ordered sequence of unambiguous instructions or steps designed to solve a problem or complete a specific task.',
          bulletPoints: [
            'Clear and Unambiguous: Each instruction must have only one possible interpretation.',
            'Finite: The algorithm must terminate after a countable number of steps.',
            'Sequential: The order of instructions is vital; steps cannot be executed randomly.',
          ],
          examples: [
            'Everyday Example 1 (Making Tea): 1. Fill kettle with water. 2. Boil water. 3. Place tea bag into mug. 4. Pour boiling water into mug. 5. Allow to brew for 2 minutes. 6. Remove tea bag. 7. Add milk and sugar to taste. 8. Stir and serve.',
            'Everyday Example 2 (Crossing the Road): 1. Stop at the curb. 2. Look left. 3. Look right. 4. Look left again. 5. IF road is clear THEN walk across safely ELSE wait.',
          ],
        },
        {
          heading: '3. The Four Fundamental Programming Concepts',
          subheading: 'Core Logic Building Blocks',
          content: 'Regardless of the programming language used, all software logic is built upon four fundamental principles:',
          bulletPoints: [
            'Sequencing: Executing statements in a strict sequential order, from the top down.',
            'Selection (Conditionals): Making decisions based on specific conditions using statements like IF, THEN, and ELSE.',
            'Iteration (Loops): Repeating a set of instructions multiple times until a condition is satisfied (e.g. WHILE, FOR).',
            'Variables: Named storage locations in computer memory that hold data values that can be read and modified during program execution.',
          ],
        },
        {
          heading: '4. Robotics and Intelligent Systems',
          subheading: 'Definition & The Sense-Think-Act Cycle',
          content: 'Robotics is an engineering discipline focused on the design, construction, operation, and programming of robots—machines capable of carrying out a complex series of actions automatically.',
          bulletPoints: [
            'SENSE: Robots gather physical data from their surroundings using Sensors (light, sound, ultrasonic distance, temperature, gyro).',
            'THINK: The computer processor or microcontroller analyzes sensor inputs according to programmed algorithms.',
            'ACT: The robot performs physical motions in the real world using Actuators (electric motors, hydraulic pistons, grippers).',
          ],
          examples: [
            'Industrial Robots: Multi-jointed robotic arms used in automobile assembly, welding, and painting.',
            'Exploration Robots: Mars Rovers (Curiosity, Perseverance) exploring planetary surfaces where humans cannot safely travel.',
            'Medical Robots: da Vinci surgical robotics assisting surgeons with micro-precision operations.',
            'Domestic Robots: Automated vacuum cleaners and lawnmowers navigating home floorplans.',
          ],
        },
      ],
      takeawaySummary: 'Key Takeaway: An algorithm is the logical recipe; programming translates that recipe into language a machine can execute; robotics embeds those programs into mechanical bodies that interact with the physical world.',
    },
    evaluationQuestions: [
      {
        id: 'eval-1',
        questionNumber: 1,
        question: 'What is the fundamental difference between an algorithm and a computer program?',
        expectedAnswer: 'An algorithm is a conceptual, step-by-step logic recipe in plain language or diagram format; a computer program is that algorithm translated into a specific programming language syntax that a machine can execute.',
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
        question: 'Explain what would happen if a robot executing an algorithm encountered instructions that were out of order.',
        expectedAnswer: 'Because machines execute instructions literally without intuition, out-of-order instructions cause runtime errors, incorrect outputs, or physical collisions/failures.',
        type: 'written',
      },
      {
        id: 'eval-4',
        questionNumber: 4,
        question: 'Describe the "Sense, Think, Act" triad of robotics with one example of each.',
        expectedAnswer: 'Sense: gathers environmental data via Sensors (e.g. ultrasonic proximity sensor); Think: processes logic via Microcontroller/CPU; Act: executes physical movement via Actuators (e.g. motor turning wheels).',
        type: 'oral',
      },
      {
        id: 'eval-5',
        questionNumber: 5,
        question: 'Name three practical fields where robotics is actively utilized today.',
        expectedAnswer: '1. Industrial manufacturing / automobile assembly. 2. Space and deep-sea exploration. 3. Healthcare and robotic surgery.',
        type: 'written',
      },
    ],
    assignment: {
      title: 'Algorithmic Problem Solving & Robotics Investigation',
      instructions: '1. In your homework exercise book, write out a 7 to 9-step algorithm for how an automated ATM machine dispenses cash to a customer. Identify where at least one "Selection" (IF/ELSE) step takes place.\n2. Research and write down two advantages and two disadvantages of replacing human factory workers with industrial robotic arms.',
      submissionDeadline: 'Next Monday at the start of the Digital Technology period',
      gradingCriteria: 'Clarity of sequential steps (4 marks), accurate placement of IF/ELSE condition (3 marks), balanced industrial robotics analysis (3 marks). Total: 10 marks.',
    },
  },
  {
    id: 'lesson-jss3-dt-w2',
    classId: 'class-jss3',
    className: 'JSS 3',
    subjectId: 'sub-jss3-dt',
    subjectName: 'Digital Technology',
    week: 2,
    term: 1,
    topic: 'Digital Media, Data Representations, and Everyday Algorithms',
    durationMinutes: '40–45 minutes',
    status: 'planned',
    isRevision: false,
    learningObjectives: [
      'Understand how analog information (sounds, photos) is digitized into binary data.',
      'Explain the difference between vector graphics and bitmap raster images.',
      'Trace everyday algorithms powering search engines and recommendation feeds.',
    ],
    materials: [
      'Digital projector or tablet display',
      'Sample pixelated image zoom sheets',
      'Graph paper for pixel grid exercise',
    ],
    currentSectionId: 'sec-w2-1',
    completedSectionIds: [],
    sections: [
      {
        id: 'sec-w2-1',
        sectionNumber: '1',
        title: 'Set Induction / Hook',
        suggestedDurationMinutes: 5,
        teacherGuidance: [
          'Show a photograph zoomed in at 800% until giant square pixels appear.',
          'Ask students: "What are these tiny colored squares? How does a phone screen fool our eyes into seeing a smooth face?"',
        ],
        teacherQuote: 'Every picture on your phone is simply a massive grid of colored numbers.',
      },
      {
        id: 'sec-w2-2',
        sectionNumber: '2',
        title: 'Binary Representation of Colors',
        suggestedDurationMinutes: 10,
        teacherGuidance: [
          'Explain RGB (Red, Green, Blue) color mixing.',
          'Demonstrate that 8 bits gives 256 levels of intensity per channel.',
        ],
      },
      {
        id: 'sec-w2-3',
        sectionNumber: '3',
        title: 'Vector vs Raster Graphics',
        suggestedDurationMinutes: 12,
        teacherGuidance: [
          'Contrast mathematical vector formulas (SVG) with raster pixels (JPEG/PNG).',
          'Demonstrate infinite scaling without loss of crispness.',
        ],
      },
      {
        id: 'sec-w2-4',
        sectionNumber: '4',
        title: 'Student Notes & Practical Grid Drawing',
        suggestedDurationMinutes: 8,
        teacherGuidance: [
          'Students copy the digital media notes and complete a 5x5 pixel bitmap grid in their exercise books.',
        ],
      },
      {
        id: 'sec-w2-5',
        sectionNumber: '5',
        title: 'Evaluation & Weekly Assignment',
        suggestedDurationMinutes: 5,
        teacherGuidance: [
          'Ask 3 rapid-fire questions on RGB color depth and raster pixelation.',
        ],
      },
    ],
    studentNote: {
      subject: 'Digital Technology',
      topic: 'Digital Media and Data Representations',
      className: 'JSS 3',
      term: 'First Term',
      week: 2,
      sections: [
        {
          heading: '1. What is Digital Media?',
          content: 'Digital media refers to digitized content (audio, video, text, images) that can be transmitted over computer networks and processed by digital electronic systems.',
        },
        {
          heading: '2. Raster vs Vector Graphics',
          content: 'Raster images are composed of a fixed grid of colored pixels. When zoomed in, pixels become visible. Vector graphics use mathematical coordinates and can scale infinitely.',
        },
      ],
      takeawaySummary: 'All digital media is fundamentally represented as binary numbers in computer memory.',
    },
    evaluationQuestions: [
      {
        id: 'eval-w2-1',
        questionNumber: 1,
        question: 'What does the acronym RGB stand for in digital display technology?',
        expectedAnswer: 'Red, Green, Blue.',
        type: 'oral',
      },
    ],
    assignment: {
      title: 'Bitmap Representation Activity',
      instructions: 'Create an 8x8 binary bitmap icon on graph paper and write out its binary code row by row.',
    },
  },
  {
    id: 'lesson-jss3-dt-w3',
    classId: 'class-jss3',
    className: 'JSS 3',
    subjectId: 'sub-jss3-dt',
    subjectName: 'Digital Technology',
    week: 3,
    term: 1,
    topic: 'Introduction to Python & Scripting Syntax',
    durationMinutes: '40–45 minutes',
    status: 'planned',
    isRevision: false,
    learningObjectives: [
      'Write the first print() statement in Python.',
      'Understand variable assignment and data types (integer, string, float).',
      'Execute code and interpret error messages calmly.',
    ],
    materials: ['Computer lab or interactive whiteboard with Python repl'],
    currentSectionId: 'sec-w3-1',
    completedSectionIds: [],
    sections: [
      {
        id: 'sec-w3-1',
        sectionNumber: '1',
        title: 'Introduction to Python Syntax',
        suggestedDurationMinutes: 10,
        teacherGuidance: ['Introduce Guido van Rossum and the philosophy of human readability in Python.'],
      },
    ],
    studentNote: {
      subject: 'Digital Technology',
      topic: 'Introduction to Python Scripting',
      className: 'JSS 3',
      term: 'First Term',
      week: 3,
      sections: [
        {
          heading: '1. Python Fundamentals',
          content: 'Python is a high-level, interpreted programming language known for its clean syntax and readability.',
        },
      ],
      takeawaySummary: 'Python is one of the most widely used languages in artificial intelligence and automation.',
    },
    evaluationQuestions: [],
    assignment: {
      title: 'My First Python Variables',
      instructions: 'Write 4 lines of Python code declaring your name, age, class, and favorite subject.',
    },
  },
  {
    id: 'lesson-jss3-dt-w4',
    classId: 'class-jss3',
    className: 'JSS 3',
    subjectId: 'sub-jss3-dt',
    subjectName: 'Digital Technology',
    week: 4,
    term: 1,
    topic: 'Robotics Sensors, Microcontrollers, and Actuators',
    durationMinutes: '40–45 minutes',
    status: 'planned',
    isRevision: false,
    learningObjectives: [
      'Differentiate between digital and analog sensor readings.',
      'Identify the components of a microcontroller (CPU, RAM, GPIO pins).',
      'Explain how servo motors achieve precise angular positioning.',
    ],
    materials: ['Arduino / micro:bit board demo kit', 'Ultrasonic sensor module'],
    currentSectionId: 'sec-w4-1',
    completedSectionIds: [],
    sections: [
      {
        id: 'sec-w4-1',
        sectionNumber: '1',
        title: 'Sensors: The Sense Organs of Machines',
        suggestedDurationMinutes: 12,
        teacherGuidance: ['Pass around an ultrasonic distance sensor. Ask students how bats navigate using echo.'],
      },
    ],
    studentNote: {
      subject: 'Digital Technology',
      topic: 'Robotics Sensors and Microcontrollers',
      className: 'JSS 3',
      term: 'First Term',
      week: 4,
      sections: [
        {
          heading: '1. Sensor Types',
          content: 'Sensors convert physical phenomena (heat, light, distance, sound) into electrical signals.',
        },
      ],
      takeawaySummary: 'Microcontrollers read sensor inputs and direct actuator motors.',
    },
    evaluationQuestions: [],
    assignment: {
      title: 'Sensor Identification Chart',
      instructions: 'List 5 human senses and their robotic sensor equivalents.',
    },
  },
];

/** Lesson content only — progress lives in INITIAL_PROGRESS. */
export const INITIAL_LESSONS: Lesson[] = SEEDED_LESSONS.map(
  (legacy) => splitLegacyLesson(legacy).lesson,
);

export const INITIAL_PROGRESS: TeachingProgress[] = SEEDED_LESSONS.map(
  (legacy) => splitLegacyLesson(legacy).progress,
);

export const INITIAL_TOPICS: Topic[] = buildTopicsFromLessons(
  INITIAL_LESSONS,
  INITIAL_SESSIONS,
  INITIAL_WEEKS,
);
