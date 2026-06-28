/* ===========================================================
   STUDY CONTENT  —  NCO Promotion Board (E-5/E-6)
   -----------------------------------------------------------
   This is the seed deck: high-yield, board-standard facts.
   To add cards, just append to STUDY.cards using the same
   shape. Fields:
     id      unique string
     pub     publication id (must match an entry in STUDY.pubs)
     topic   short sub-topic label (optional)
     q       question (front of card)
     a       answer (back of card)
     ref     reference citation (optional)
     choices [..] optional curated multiple-choice options
     answer  index of the correct option in `choices`
     flashOnly true to keep a long-text card out of quizzes
   Quizzes use `choices` when given, otherwise build choices
   from other short answers automatically.
   =========================================================== */
window.STUDY = {
  meta: {
    title: "NCO Board Study Guide",
    subtitle: "E-5 / E-6 Promotion Board",
    version: "1.0.0",
    updated: "2026-06-28"
  },

  pubs: [
    // ---- Leadership & Doctrine ----
    { id: "adp6-22",   code: "ADP 6-22",   title: "Army Leadership and the Profession",        cat: "Leadership & Doctrine" },
    { id: "atp6-22-1", code: "ATP 6-22.1", title: "Providing Feedback: Counseling/Coaching/Mentoring", cat: "Leadership & Doctrine" },
    { id: "adp3-0",    code: "ADP 3-0",    title: "Operations",                                 cat: "Leadership & Doctrine" },
    { id: "adp5-0",    code: "ADP 5-0",    title: "The Operations Process",                     cat: "Leadership & Doctrine" },
    { id: "adp7-0",    code: "ADP 7-0",    title: "Training",                                   cat: "Leadership & Doctrine" },

    // ---- Army Regulations ----
    { id: "ar600-20",  code: "AR 600-20",  title: "Army Command Policy",                        cat: "Army Regulations" },
    { id: "ar27-10",   code: "AR 27-10",   title: "Military Justice",                           cat: "Army Regulations" },
    { id: "ar350-1",   code: "AR 350-1",   title: "Army Training and Leader Development",        cat: "Army Regulations" },
    { id: "ar670-1",   code: "AR 670-1",   title: "Wear and Appearance of Army Uniforms",       cat: "Army Regulations" },
    { id: "ar600-52",  code: "AR 600-52",  title: "SHARP Program",                              cat: "Army Regulations" },
    { id: "ar600-85",  code: "AR 600-85",  title: "Army Substance Abuse Program",               cat: "Army Regulations" },
    { id: "ar608-1",   code: "AR 608-1",   title: "Army Community Service",                     cat: "Army Regulations" },
    { id: "ar930-4",   code: "AR 930-4",   title: "Army Emergency Relief",                      cat: "Army Regulations" },

    // ---- Soldier Skills & Readiness ----
    { id: "stp21-1",   code: "STP 21-1",   title: "Common Tasks — Warrior Skills Level 1",       cat: "Soldier Skills & Readiness" },
    { id: "stp21-24",  code: "STP 21-24",  title: "Common Tasks — Warrior Leader Skills 2-4",    cat: "Soldier Skills & Readiness" },
    { id: "fm7-22",    code: "FM 7-22",    title: "Holistic Health and Fitness (H2F)",          cat: "Soldier Skills & Readiness" },
    { id: "tc7-21-13", code: "TC 7-21.13", title: "The Soldier's Guide",                        cat: "Soldier Skills & Readiness" },
    { id: "atp3-50-20",code: "ATP 3-50.20",title: "SERE — Survival, Evasion, Resistance, Escape",cat: "Soldier Skills & Readiness" }
  ],

  cards: [
    /* ================= ADP 6-22 — Leadership ================= */
    { id:"adp6-22-01", pub:"adp6-22", topic:"Definition", q:"How does the Army define leadership?", a:"The activity of influencing people by providing purpose, direction, and motivation to accomplish the mission and improve the organization.", ref:"ADP 6-22" },
    { id:"adp6-22-02", pub:"adp6-22", topic:"Definition", q:"What three things does a leader provide when influencing people?", a:"Purpose, Direction, and Motivation.", ref:"ADP 6-22", choices:["Purpose, Direction, Motivation","Mission, Vision, Values","Plan, Prepare, Execute","Shoot, Move, Communicate"], answer:0 },
    { id:"adp6-22-03", pub:"adp6-22", topic:"Leadership Model", q:"What two parts make up the Leadership Requirements Model?", a:"Attributes (what a leader IS) and Competencies (what a leader DOES).", ref:"ADP 6-22", choices:["Attributes and Competencies","Character and Presence","Skills and Tasks","Values and Ethics"], answer:0 },
    { id:"adp6-22-04", pub:"adp6-22", topic:"Attributes", q:"What are the three leader attributes?", a:"Character, Presence, and Intellect.", ref:"ADP 6-22", choices:["Character, Presence, Intellect","Leads, Develops, Achieves","Loyalty, Duty, Respect","Mind, Body, Spirit"], answer:0 },
    { id:"adp6-22-05", pub:"adp6-22", topic:"Competencies", q:"What are the three leader competencies?", a:"Leads, Develops, and Achieves.", ref:"ADP 6-22", choices:["Leads, Develops, Achieves","Character, Presence, Intellect","Plan, Prepare, Execute","Train, Coach, Mentor"], answer:0 },
    { id:"adp6-22-06", pub:"adp6-22", topic:"Levels", q:"What are the three levels of leadership?", a:"Direct, Organizational, and Strategic.", ref:"ADP 6-22", choices:["Direct, Organizational, Strategic","Tactical, Operational, Strategic","Squad, Platoon, Company","Junior, Mid, Senior"], answer:0 },
    { id:"adp6-22-07", pub:"adp6-22", topic:"Army Values", q:"What are the seven Army Values? (LDRSHIP)", a:"Loyalty, Duty, Respect, Selfless Service, Honor, Integrity, and Personal Courage.", ref:"ADP 6-22", flashOnly:true },
    { id:"adp6-22-08", pub:"adp6-22", topic:"Army Values", q:"What does the acronym LDRSHIP stand for?", a:"Loyalty, Duty, Respect, Selfless Service, Honor, Integrity, Personal Courage.", ref:"ADP 6-22", flashOnly:true },
    { id:"adp6-22-09", pub:"adp6-22", topic:"Warrior Ethos", q:"Recite the four lines of the Warrior Ethos.", a:"I will always place the mission first.\nI will never accept defeat.\nI will never quit.\nI will never leave a fallen comrade.", ref:"ADP 6-22", flashOnly:true },
    { id:"adp6-22-10", pub:"adp6-22", topic:"BE-KNOW-DO", q:"What does the leadership framework BE-KNOW-DO represent?", a:"BE (character/attributes), KNOW (competence/knowledge), DO (actions/competencies).", ref:"ADP 6-22" },
    { id:"adp6-22-11", pub:"adp6-22", topic:"The Profession", q:"What are the five characteristics of the Army Profession?", a:"Military Expertise, Honorable Service, Trust, Esprit de Corps, and Stewardship of the Profession.", ref:"ADP 6-22", flashOnly:true },
    { id:"adp6-22-12", pub:"adp6-22", topic:"Certification", q:"What three certification criteria make an Army professional?", a:"Character, Competence, and Commitment.", ref:"ADP 6-22", choices:["Character, Competence, Commitment","Loyalty, Duty, Respect","Mind, Body, Spirit","Skill, Will, Drill"], answer:0 },
    { id:"adp6-22-13", pub:"adp6-22", topic:"Influence", q:"Name three of the methods of influence a leader can use.", a:"Pressure, legitimating, exchange, reciprocation, rational persuasion, apprising, inspirational appeals, participation, relationship building, or collaboration (any three).", ref:"ADP 6-22", flashOnly:true },

    /* ================= ATP 6-22.1 — Counseling ================= */
    { id:"atp6221-01", pub:"atp6-22-1", topic:"Types", q:"What are the three major types of developmental counseling?", a:"Event-oriented, Performance, and Professional growth counseling.", ref:"ATP 6-22.1", choices:["Event-oriented, Performance, Professional growth","Verbal, Written, Formal","Positive, Negative, Neutral","Initial, Monthly, Annual"], answer:0 },
    { id:"atp6221-02", pub:"atp6-22-1", topic:"Forms", q:"What form is used to document developmental counseling?", a:"DA Form 4856 (Developmental Counseling Form).", ref:"ATP 6-22.1", choices:["DA Form 4856","DA Form 2062","DA Form 638","DA Form 705"], answer:0 },
    { id:"atp6221-03", pub:"atp6-22-1", topic:"Approaches", q:"What are the three approaches to counseling?", a:"Directive, Nondirective, and Combined.", ref:"ATP 6-22.1", choices:["Directive, Nondirective, Combined","Formal, Informal, Verbal","Open, Closed, Mixed","Positive, Corrective, Final"], answer:0 },
    { id:"atp6221-04", pub:"atp6-22-1", topic:"Feedback Tools", q:"What three developmental feedback tools does ATP 6-22.1 cover?", a:"Counseling, Coaching, and Mentoring.", ref:"ATP 6-22.1", choices:["Counseling, Coaching, Mentoring","Train, Advise, Assist","Lead, Develop, Achieve","Plan, Prepare, Execute"], answer:0 },
    { id:"atp6221-05", pub:"atp6-22-1", topic:"Qualities", q:"What are the qualities of an effective counselor?", a:"Respect for subordinates, self-awareness and cultural awareness, empathy, and credibility.", ref:"ATP 6-22.1", flashOnly:true },
    { id:"atp6221-06", pub:"atp6-22-1", topic:"Coaching vs Mentoring", q:"How does coaching differ from mentoring?", a:"Coaching guides someone to develop and improve their own skills (often task/goal focused); mentoring is a voluntary, future-oriented developmental relationship built on trust.", ref:"ATP 6-22.1", flashOnly:true },

    /* ================= ADP 3-0 — Operations ================= */
    { id:"adp30-01", pub:"adp3-0", topic:"Warfighting Functions", q:"What are the six warfighting functions?", a:"Command and Control (Mission Command), Movement and Maneuver, Intelligence, Fires, Sustainment, and Protection.", ref:"ADP 3-0", flashOnly:true },
    { id:"adp30-02", pub:"adp3-0", topic:"Decisive Action", q:"What are the elements (tasks) of decisive action?", a:"Offense, Defense, and Stability (or Defense Support of Civil Authorities — DSCA).", ref:"ADP 3-0", choices:["Offense, Defense, Stability/DSCA","Shoot, Move, Communicate","Plan, Prepare, Execute","Attack, Defend, Retreat"], answer:0 },
    { id:"adp30-03", pub:"adp3-0", topic:"Strategic Roles", q:"What are the Army's four strategic roles?", a:"Shape operational environments, prevent conflict, prevail in large-scale ground combat, and consolidate gains.", ref:"ADP 3-0", flashOnly:true },
    { id:"adp30-04", pub:"adp3-0", topic:"Operations", q:"How many warfighting functions are there?", a:"Six.", ref:"ADP 3-0", choices:["Six","Four","Five","Eight"], answer:0 },

    /* ================= ADP 5-0 — Operations Process ================= */
    { id:"adp50-01", pub:"adp5-0", topic:"Operations Process", q:"What are the four activities of the operations process?", a:"Plan, Prepare, Execute, and Assess.", ref:"ADP 5-0", choices:["Plan, Prepare, Execute, Assess","Shoot, Move, Communicate, Survive","Receive, Plan, Brief, Execute","Analyze, Decide, Direct, Assess"], answer:0 },
    { id:"adp50-02", pub:"adp5-0", topic:"MDMP", q:"How many steps are in the Military Decision-Making Process (MDMP)?", a:"Seven.", ref:"ADP 5-0", choices:["Seven","Five","Six","Eight"], answer:0 },
    { id:"adp50-03", pub:"adp5-0", topic:"MDMP", q:"List the seven steps of the MDMP.", a:"1) Receipt of mission 2) Mission analysis 3) COA development 4) COA analysis (war game) 5) COA comparison 6) COA approval 7) Orders production, dissemination, and transition.", ref:"ADP 5-0", flashOnly:true },
    { id:"adp50-04", pub:"adp5-0", topic:"TLP", q:"How many steps are in Troop Leading Procedures (TLP)?", a:"Eight.", ref:"ADP 5-0", choices:["Eight","Seven","Five","Six"], answer:0 },
    { id:"adp50-05", pub:"adp5-0", topic:"TLP", q:"List the eight steps of Troop Leading Procedures.", a:"1) Receive the mission 2) Issue a warning order 3) Make a tentative plan 4) Initiate movement 5) Conduct reconnaissance 6) Complete the plan 7) Issue the order 8) Supervise and refine.", ref:"ADP 5-0", flashOnly:true },
    { id:"adp50-06", pub:"adp5-0", topic:"Commander's Activities", q:"What are the commander's activities in the operations process?", a:"Understand, Visualize, Describe, Direct, Lead, and Assess.", ref:"ADP 5-0", flashOnly:true },

    /* ================= ADP 7-0 — Training ================= */
    { id:"adp70-01", pub:"adp7-0", topic:"Reference", q:"What publication is the Army's doctrine for Training?", a:"ADP 7-0.", ref:"ADP 7-0", choices:["ADP 7-0","ADP 6-22","AR 350-1","FM 7-22"], answer:0 },
    { id:"adp70-02", pub:"adp7-0", topic:"Principle", q:"What training principle means training should replicate combat conditions?", a:"Train as you fight.", ref:"ADP 7-0", choices:["Train as you fight","Crawl-walk-run","Train to standard","Train to sustain"], answer:0 },
    { id:"adp70-03", pub:"adp7-0", topic:"Method", q:"What training method progresses from simple to complex in stages?", a:"The crawl-walk-run approach.", ref:"ADP 7-0", choices:["Crawl-walk-run","Train as you fight","Plan-prepare-execute","Shoot-move-communicate"], answer:0 },
    { id:"adp70-04", pub:"adp7-0", topic:"METL", q:"What does METL stand for?", a:"Mission-Essential Task List.", ref:"ADP 7-0", choices:["Mission-Essential Task List","Military Education & Training List","Major Event Timeline","Mandatory Evaluation Task List"], answer:0 },
    { id:"adp70-05", pub:"adp7-0", topic:"Responsibility", q:"Who is the unit's primary trainer?", a:"The commander. NCOs train individual Soldiers, crews, and small teams.", ref:"ADP 7-0" },
    { id:"adp70-06", pub:"adp7-0", topic:"Principles", q:"Name the principles of training in ADP 7-0.", a:"Commanders and other leaders are responsible for training; NCOs train individuals, crews, and small teams; train as you fight; train to standard; train to sustain; train to maintain; train to develop adaptability.", ref:"ADP 7-0", flashOnly:true },

    /* ================= AR 600-20 — Command Policy ================= */
    { id:"ar60020-01", pub:"ar600-20", topic:"Reference", q:"What Army Regulation covers the Army Command Policy?", a:"AR 600-20.", ref:"AR 600-20", choices:["AR 600-20","AR 670-1","AR 350-1","AR 27-10"], answer:0 },
    { id:"ar60020-02", pub:"ar600-20", topic:"Purpose", q:"What does AR 600-20 establish?", a:"The policies and responsibilities of command, military discipline and conduct, the Army Equal Opportunity program, and prevention of harassment.", ref:"AR 600-20", flashOnly:true },
    { id:"ar60020-03", pub:"ar600-20", topic:"Chain of Command", q:"What is the chain of command?", a:"The succession of commanders, superior to subordinate, through which command is exercised.", ref:"AR 600-20", flashOnly:true },
    { id:"ar60020-04", pub:"ar600-20", topic:"NCO Support Channel", q:"What channel parallels and reinforces the chain of command?", a:"The NCO support channel.", ref:"AR 600-20", choices:["The NCO support channel","The open door policy","The IG channel","The EO channel"], answer:0 },
    { id:"ar60020-05", pub:"ar600-20", topic:"NCO Support Channel", q:"The NCO support channel runs from the CSM through the 1SG to whom?", a:"To the other NCOs and enlisted Soldiers of the unit.", ref:"AR 600-20" },
    { id:"ar60020-06", pub:"ar600-20", topic:"Discipline", q:"Military discipline is founded upon what?", a:"Self-discipline, respect for properly constituted authority, and the embracing of the professional Army ethic.", ref:"AR 600-20", flashOnly:true },
    { id:"ar60020-07", pub:"ar600-20", topic:"Hazing", q:"Are hazing and bullying permitted in the Army?", a:"No. Hazing and bullying are prohibited.", ref:"AR 600-20", choices:["No, both are prohibited","Yes, if in training","Only with consent","Yes, for new Soldiers"], answer:0 },
    { id:"ar60020-08", pub:"ar600-20", topic:"EO", q:"What program ensures fair treatment regardless of race, color, religion, gender, or national origin?", a:"The Equal Opportunity (EO) Program.", ref:"AR 600-20", choices:["Equal Opportunity (EO) Program","SHARP","ASAP","ACS"], answer:0 },
    { id:"ar60020-09", pub:"ar600-20", topic:"Senior Advisor", q:"Who is the senior enlisted advisor to the commander?", a:"The Command Sergeant Major (CSM).", ref:"AR 600-20", choices:["Command Sergeant Major (CSM)","First Sergeant (1SG)","Sergeant Major of the Army","Platoon Sergeant"], answer:0 },

    /* ================= AR 27-10 — Military Justice ================= */
    { id:"ar2710-01", pub:"ar27-10", topic:"Reference", q:"What Army Regulation covers Military Justice?", a:"AR 27-10.", ref:"AR 27-10", choices:["AR 27-10","AR 600-20","AR 600-85","AR 350-1"], answer:0 },
    { id:"ar2710-02", pub:"ar27-10", topic:"UCMJ", q:"What does UCMJ stand for?", a:"Uniform Code of Military Justice.", ref:"AR 27-10", choices:["Uniform Code of Military Justice","United Command Military Justice","Unit Conduct & Military Justice","Universal Code of Military Justice"], answer:0 },
    { id:"ar2710-03", pub:"ar27-10", topic:"Article 15", q:"Nonjudicial punishment is commonly known by what name?", a:"Article 15.", ref:"AR 27-10", choices:["Article 15","Article 32","Chapter 4","Field Grade"], answer:0 },
    { id:"ar2710-04", pub:"ar27-10", topic:"Courts-Martial", q:"What are the three types of courts-martial?", a:"Summary, Special, and General.", ref:"AR 27-10", choices:["Summary, Special, General","Minor, Major, Capital","Field, Company, Battalion","Open, Closed, Mixed"], answer:0 },
    { id:"ar2710-05", pub:"ar27-10", topic:"Article 15", q:"Can a Soldier generally demand trial by court-martial instead of accepting an Article 15?", a:"Yes — except a Soldier attached to or embarked on a vessel.", ref:"AR 27-10" },

    /* ================= AR 350-1 — Training & Leader Dev ================= */
    { id:"ar3501-01", pub:"ar350-1", topic:"Reference", q:"What Army Regulation covers Army Training and Leader Development?", a:"AR 350-1.", ref:"AR 350-1", choices:["AR 350-1","ADP 7-0","AR 600-20","AR 600-52"], answer:0 },
    { id:"ar3501-02", pub:"ar350-1", topic:"Domains", q:"What are the three domains of leader development?", a:"Institutional, Operational, and Self-development.", ref:"AR 350-1", choices:["Institutional, Operational, Self-development","Direct, Organizational, Strategic","Tactical, Operational, Strategic","Mental, Physical, Spiritual"], answer:0 },
    { id:"ar3501-03", pub:"ar350-1", topic:"Self-development", q:"What are the three types of self-development?", a:"Structured, Guided, and Personal self-development.", ref:"AR 350-1", choices:["Structured, Guided, Personal","Formal, Informal, Optional","Basic, Advanced, Expert","Required, Elective, Bonus"], answer:0 },

    /* ================= AR 670-1 — Uniforms ================= */
    { id:"ar6701-01", pub:"ar670-1", topic:"Reference", q:"What Army Regulation covers the wear and appearance of Army uniforms and insignia?", a:"AR 670-1.", ref:"AR 670-1", choices:["AR 670-1","AR 600-20","AR 600-85","DA PAM 600-25"], answer:0 },
    { id:"ar6701-02", pub:"ar670-1", topic:"Companion", q:"What pamphlet is the companion guide to AR 670-1 with detailed uniform illustrations?", a:"DA PAM 670-1.", ref:"AR 670-1", choices:["DA PAM 670-1","DA PAM 600-25","DA PAM 350-1","DA PAM 27-10"], answer:0 },
    { id:"ar6701-03", pub:"ar670-1", topic:"Standard", q:"What is the general standard for a Soldier's appearance in uniform?", a:"Neat, clean, professional, and conservative — uniforms worn so as to present a sharp military image; grooming must not interfere with proper wear of headgear or equipment.", ref:"AR 670-1", flashOnly:true },
    { id:"ar6701-04", pub:"ar670-1", topic:"Responsibility", q:"Who is responsible for ensuring Soldiers present a proper military appearance?", a:"Commanders and leaders at all levels — and ultimately each individual Soldier.", ref:"AR 670-1" },

    /* ================= AR 600-52 — SHARP ================= */
    { id:"ar60052-01", pub:"ar600-52", topic:"Reference", q:"What Army Regulation covers the SHARP program?", a:"AR 600-52.", ref:"AR 600-52", choices:["AR 600-52","AR 600-20","AR 600-85","AR 608-1"], answer:0 },
    { id:"ar60052-02", pub:"ar600-52", topic:"Acronym", q:"What does SHARP stand for?", a:"Sexual Harassment/Assault Response and Prevention.", ref:"AR 600-52", choices:["Sexual Harassment/Assault Response and Prevention","Soldier Health and Readiness Program","Sexual Harassment Awareness and Reporting Policy","Safety, Health, and Readiness Program"], answer:0 },
    { id:"ar60052-03", pub:"ar600-52", topic:"Reporting", q:"What are the two types of sexual assault reporting?", a:"Restricted and Unrestricted.", ref:"AR 600-52", choices:["Restricted and Unrestricted","Formal and Informal","Open and Closed","Verbal and Written"], answer:0 },
    { id:"ar60052-04", pub:"ar600-52", topic:"Restricted", q:"What is a Restricted Report?", a:"A confidential report (to a SARC, VA, or healthcare provider) that gives the victim access to services without triggering an investigation or notifying the command.", ref:"AR 600-52", flashOnly:true },
    { id:"ar60052-05", pub:"ar600-52", topic:"Unrestricted", q:"What is an Unrestricted Report?", a:"A report that initiates an official investigation and notifies the chain of command, while the victim still receives medical care and victim advocacy.", ref:"AR 600-52", flashOnly:true },
    { id:"ar60052-06", pub:"ar600-52", topic:"Form", q:"What form documents a victim's reporting preference?", a:"DD Form 2910 (Victim Reporting Preference Statement).", ref:"AR 600-52", choices:["DD Form 2910","DA Form 4856","DD Form 2911","DA Form 3349"], answer:0 },
    { id:"ar60052-07", pub:"ar600-52", topic:"Personnel", q:"Who are the two primary SHARP responders?", a:"The SARC (Sexual Assault Response Coordinator) and the SHARP Victim Advocate (VA).", ref:"AR 600-52" },

    /* ================= AR 600-85 — ASAP ================= */
    { id:"ar60085-01", pub:"ar600-85", topic:"Reference", q:"What Army Regulation covers the Army Substance Abuse Program?", a:"AR 600-85.", ref:"AR 600-85", choices:["AR 600-85","AR 600-20","AR 600-52","AR 608-1"], answer:0 },
    { id:"ar60085-02", pub:"ar600-85", topic:"Acronym", q:"What does ASAP stand for?", a:"Army Substance Abuse Program.", ref:"AR 600-85", choices:["Army Substance Abuse Program","Alcohol & Substance Awareness Plan","Army Soldier Assistance Program","Active Substance Abuse Prevention"], answer:0 },
    { id:"ar60085-03", pub:"ar600-85", topic:"Goal", q:"What is the primary goal of ASAP?", a:"To strengthen the readiness of the force by deterring and treating alcohol and other drug abuse and returning affected Soldiers to duty.", ref:"AR 600-85", flashOnly:true },
    { id:"ar60085-04", pub:"ar600-85", topic:"Limited Use", q:"What is the Limited Use Policy?", a:"A policy that limits the Army's use of protected evidence (such as a voluntary self-referral or test results) against a Soldier, to encourage seeking treatment.", ref:"AR 600-85", flashOnly:true },
    { id:"ar60085-05", pub:"ar600-85", topic:"Self-referral", q:"May a Soldier refer themselves to ASAP for help?", a:"Yes — Soldiers may self-refer for substance abuse help.", ref:"AR 600-85", choices:["Yes, Soldiers may self-refer","No, only commanders refer","Only after an Article 15","Only medical staff may refer"], answer:0 },

    /* ================= AR 608-1 — ACS ================= */
    { id:"ar6081-01", pub:"ar608-1", topic:"Reference", q:"What Army Regulation covers Army Community Service?", a:"AR 608-1.", ref:"AR 608-1", choices:["AR 608-1","AR 930-4","AR 600-20","AR 600-85"], answer:0 },
    { id:"ar6081-02", pub:"ar608-1", topic:"Purpose", q:"What is Army Community Service (ACS)?", a:"A program that provides services and support to Soldiers and Families — relocation, financial readiness, employment, EFMP, family advocacy, and more.", ref:"AR 608-1", flashOnly:true },
    { id:"ar6081-03", pub:"ar608-1", topic:"Symbol", q:"What is the ACS symbol?", a:"A heart cupped within a hand — representing people helping people.", ref:"AR 608-1", choices:["A heart cupped in a hand","An eagle and shield","A torch","Crossed rifles"], answer:0 },
    { id:"ar6081-04", pub:"ar608-1", topic:"Programs", q:"Name three programs offered under ACS.", a:"Any of: Army Emergency Relief, Exceptional Family Member Program (EFMP), Family Advocacy Program, Financial Readiness, Relocation Readiness, Employment Readiness, Survivor Outreach Services.", ref:"AR 608-1", flashOnly:true },

    /* ================= AR 930-4 — AER ================= */
    { id:"ar9304-01", pub:"ar930-4", topic:"Reference", q:"What Army Regulation covers Army Emergency Relief?", a:"AR 930-4.", ref:"AR 930-4", choices:["AR 930-4","AR 608-1","AR 600-20","AR 600-85"], answer:0 },
    { id:"ar9304-02", pub:"ar930-4", topic:"Purpose", q:"What is Army Emergency Relief (AER)?", a:"A private nonprofit organization that provides emergency financial assistance to Soldiers and their Families.", ref:"AR 930-4", flashOnly:true },
    { id:"ar9304-03", pub:"ar930-4", topic:"Motto", q:"What is AER's motto?", a:"\"Helping the Army Take Care of Its Own.\"", ref:"AR 930-4", choices:["Helping the Army Take Care of Its Own","Service Before Self","This We'll Defend","Army Strong"], answer:0 },
    { id:"ar9304-04", pub:"ar930-4", topic:"Assistance", q:"How does AER provide financial assistance?", a:"Through interest-free loans, grants, or a combination of both — and scholarships for dependents.", ref:"AR 930-4", flashOnly:true },

    /* ================= STP 21-1 — Warrior Skills L1 ================= */
    { id:"stp211-01", pub:"stp21-1", topic:"SMCT", q:"What does SMCT stand for?", a:"Soldier's Manual of Common Tasks.", ref:"STP 21-1-SMCT", choices:["Soldier's Manual of Common Tasks","Standard Military Common Tasks","Soldier Mastery & Combat Training","Standard Manual of Combat Tasks"], answer:0 },
    { id:"stp211-02", pub:"stp21-1", topic:"Skill Level", q:"STP 21-1-SMCT covers tasks for which skill level?", a:"Warrior Skills Level 1 (Skill Level 1 — junior enlisted).", ref:"STP 21-1-SMCT", choices:["Skill Level 1","Skill Levels 2-4","Skill Level 5","All levels"], answer:0 },
    { id:"stp211-03", pub:"stp21-1", topic:"Warrior Skills", q:"What four task areas frame the Warrior Skills?", a:"Shoot, Move, Communicate, and Survive.", ref:"STP 21-1-SMCT", choices:["Shoot, Move, Communicate, Survive","Plan, Prepare, Execute, Assess","Lead, Develop, Achieve, Train","Look, Listen, Move, React"], answer:0 },
    { id:"stp211-04", pub:"stp21-1", topic:"TCCC", q:"What does the casualty-care algorithm MARCH stand for?", a:"Massive hemorrhage, Airway, Respiration, Circulation, Hypothermia/Head injury.", ref:"STP 21-1-SMCT", flashOnly:true },
    { id:"stp211-05", pub:"stp21-1", topic:"TCCC", q:"What are the three phases of Tactical Combat Casualty Care (TCCC)?", a:"Care Under Fire, Tactical Field Care, and Tactical Evacuation Care.", ref:"STP 21-1-SMCT", choices:["Care Under Fire, Tactical Field Care, Tactical Evacuation Care","Assess, Treat, Evacuate","Primary, Secondary, Tertiary","Triage, Treatment, Transport"], answer:0 },

    /* ================= STP 21-24 — Warrior Leader Skills ================= */
    { id:"stp2124-01", pub:"stp21-24", topic:"Skill Level", q:"STP 21-24-SMCT covers tasks for which skill levels?", a:"Warrior Leader Skills, Skill Levels 2, 3, and 4 (NCO tasks).", ref:"STP 21-24-SMCT", choices:["Skill Levels 2, 3, and 4","Skill Level 1 only","Skill Level 5","Officer tasks"], answer:0 },
    { id:"stp2124-02", pub:"stp21-24", topic:"Common Task", q:"What is a 'common task'?", a:"A critical task that every Soldier at a given skill level must be able to perform, regardless of MOS.", ref:"STP 21-24-SMCT", flashOnly:true },
    { id:"stp2124-03", pub:"stp21-24", topic:"Skill Levels", q:"In general, which ranks correspond to Skill Levels 2, 3, and 4?", a:"SL2 = SGT, SL3 = SSG, SL4 = SFC (NCO ranks).", ref:"STP 21-24-SMCT" },

    /* ================= FM 7-22 — H2F ================= */
    { id:"fm722-01", pub:"fm7-22", topic:"Reference", q:"What field manual covers Holistic Health and Fitness?", a:"FM 7-22.", ref:"FM 7-22", choices:["FM 7-22","FM 7-21.13","AR 350-1","ADP 7-0"], answer:0 },
    { id:"fm722-02", pub:"fm7-22", topic:"Acronym", q:"What does H2F stand for?", a:"Holistic Health and Fitness.", ref:"FM 7-22", choices:["Holistic Health and Fitness","Health, Hygiene & Fitness","High-intensity Health & Fitness","Holistic Human Function"], answer:0 },
    { id:"fm722-03", pub:"fm7-22", topic:"Domains", q:"What are the five domains of H2F readiness?", a:"Physical, Nutritional, Mental, Spiritual, and Sleep readiness.", ref:"FM 7-22", flashOnly:true },
    { id:"fm722-04", pub:"fm7-22", topic:"Fitness Test", q:"What is the Army's physical fitness test of record?", a:"The Army Combat Fitness Test (ACFT).", ref:"FM 7-22", choices:["Army Combat Fitness Test (ACFT)","Army Physical Fitness Test (APFT)","Occupational Physical Assessment Test","Holistic Fitness Test"], answer:0 },
    { id:"fm722-05", pub:"fm7-22", topic:"ACFT", q:"How many events are in the ACFT?", a:"Six.", ref:"FM 7-22", choices:["Six","Three","Five","Four"], answer:0 },
    { id:"fm722-06", pub:"fm7-22", topic:"ACFT", q:"Name the six ACFT events. (Confirm exact events against your unit's current standard.)", a:"3-Rep Max Deadlift (MDL), Standing Power Throw (SPT), Hand-Release Push-Up (HRP), Sprint-Drag-Carry (SDC), Plank (PLK), and 2-Mile Run (2MR).", ref:"FM 7-22", flashOnly:true },

    /* ================= TC 7-21.13 — Soldier's Guide ================= */
    { id:"tc72113-01", pub:"tc7-21-13", topic:"Reference", q:"What training circular is 'The Soldier's Guide'?", a:"TC 7-21.13.", ref:"TC 7-21.13", choices:["TC 7-21.13","FM 7-22","TC 3-21.5","ADP 6-22"], answer:0 },
    { id:"tc72113-02", pub:"tc7-21-13", topic:"Soldier's Creed", q:"Recite the Soldier's Creed.", a:"I am an American Soldier.\nI am a warrior and a member of a team.\nI serve the people of the United States, and live the Army Values.\nI will always place the mission first.\nI will never accept defeat.\nI will never quit.\nI will never leave a fallen comrade.\nI am disciplined, physically and mentally tough, trained and proficient in my warrior tasks and drills.\nI always maintain my arms, my equipment, and myself.\nI am an expert and I am a professional.\nI stand ready to deploy, engage, and destroy the enemies of the United States of America in close combat.\nI am a guardian of freedom and the American way of life.\nI am an American Soldier.", ref:"TC 7-21.13", flashOnly:true },
    { id:"tc72113-03", pub:"tc7-21-13", topic:"NCO Creed", q:"Recite the first stanza of the NCO Creed.", a:"No one is more professional than I. I am a noncommissioned officer, a leader of Soldiers. As a noncommissioned officer, I realize that I am a member of a time-honored corps, which is known as 'The Backbone of the Army.' I am proud of the Corps of noncommissioned officers and will at all times conduct myself so as to bring credit upon the Corps, the military service, and my country regardless of the situation in which I find myself. I will not use my grade or position to attain pleasure, profit, or personal safety.", ref:"TC 7-21.13", flashOnly:true },
    { id:"tc72113-04", pub:"tc7-21-13", topic:"General Orders", q:"What is the 1st General Order?", a:"I will guard everything within the limits of my post and quit my post only when properly relieved.", ref:"TC 7-21.13", flashOnly:true },
    { id:"tc72113-05", pub:"tc7-21-13", topic:"General Orders", q:"What is the 2nd General Order?", a:"I will obey my special orders and perform all my duties in a military manner.", ref:"TC 7-21.13", flashOnly:true },
    { id:"tc72113-06", pub:"tc7-21-13", topic:"General Orders", q:"What is the 3rd General Order?", a:"I will report violations of my special orders, emergencies, and anything not covered in my instructions to the commander of the relief.", ref:"TC 7-21.13", flashOnly:true },
    { id:"tc72113-07", pub:"tc7-21-13", topic:"Army Birthday", q:"On what date was the U.S. Army established?", a:"14 June 1775.", ref:"TC 7-21.13", choices:["14 June 1775","4 July 1776","11 November 1918","1 October 1775"], answer:0 },
    { id:"tc72113-08", pub:"tc7-21-13", topic:"Army Song", q:"What is the official song of the U.S. Army?", a:"\"The Army Goes Rolling Along.\"", ref:"TC 7-21.13", choices:["The Army Goes Rolling Along","The Caisson Song","Anchors Aweigh","This We'll Defend"], answer:0 },
    { id:"tc72113-09", pub:"tc7-21-13", topic:"Ranks", q:"What is the rank of an E-5?", a:"Sergeant (SGT).", ref:"TC 7-21.13", choices:["Sergeant (SGT)","Staff Sergeant (SSG)","Corporal (CPL)","Specialist (SPC)"], answer:0 },
    { id:"tc72113-10", pub:"tc7-21-13", topic:"Ranks", q:"What is the rank of an E-6?", a:"Staff Sergeant (SSG).", ref:"TC 7-21.13", choices:["Staff Sergeant (SSG)","Sergeant (SGT)","Sergeant First Class (SFC)","Corporal (CPL)"], answer:0 },
    { id:"tc72113-11", pub:"tc7-21-13", topic:"Ranks", q:"Which E-4 rank is the lowest grade of NCO?", a:"Corporal (CPL).", ref:"TC 7-21.13", choices:["Corporal (CPL)","Specialist (SPC)","Sergeant (SGT)","Private First Class (PFC)"], answer:0 },
    { id:"tc72113-12", pub:"tc7-21-13", topic:"Motto", q:"What is the motto on the Army flag?", a:"\"This We'll Defend.\"", ref:"TC 7-21.13", choices:["This We'll Defend","Army Strong","Duty, Honor, Country","Always Ready"], answer:0 },

    /* ================= ATP 3-50.20 — SERE ================= */
    { id:"sere-01", pub:"atp3-50-20", topic:"Acronym", q:"What does SERE stand for?", a:"Survival, Evasion, Resistance, and Escape.", ref:"ATP 3-50.20", choices:["Survival, Evasion, Resistance, Escape","Search, Evade, Rescue, Escape","Survive, Engage, Resist, Exit","Shelter, Evade, Recover, Escape"], answer:0 },
    { id:"sere-02", pub:"atp3-50-20", topic:"Reference", q:"What publication covers SERE planning and preparation?", a:"ATP 3-50.20.", ref:"ATP 3-50.20", choices:["ATP 3-50.20","FM 3-05.70","ATP 3-50.21","TC 7-21.13"], answer:0 },
    { id:"sere-03", pub:"atp3-50-20", topic:"Code of Conduct", q:"How many articles are in the Code of Conduct?", a:"Six.", ref:"ATP 3-50.20", choices:["Six","Five","Four","Seven"], answer:0 },
    { id:"sere-04", pub:"atp3-50-20", topic:"Code of Conduct", q:"What is Article I of the Code of Conduct?", a:"I am an American, fighting in the forces which guard my country and our way of life. I am prepared to give my life in their defense.", ref:"ATP 3-50.20", flashOnly:true },
    { id:"sere-05", pub:"atp3-50-20", topic:"Code of Conduct", q:"What is Article II of the Code of Conduct?", a:"I will never surrender of my own free will. If in command, I will never surrender the members of my command while they still have the means to resist.", ref:"ATP 3-50.20", flashOnly:true },
    { id:"sere-06", pub:"atp3-50-20", topic:"Code of Conduct", q:"What is Article III of the Code of Conduct?", a:"If I am captured I will continue to resist by all means available. I will make every effort to escape and aid others to escape. I will accept neither parole nor special favors from the enemy.", ref:"ATP 3-50.20", flashOnly:true },
    { id:"sere-07", pub:"atp3-50-20", topic:"Code of Conduct", q:"What is Article IV of the Code of Conduct?", a:"If I become a prisoner of war, I will keep faith with my fellow prisoners. I will give no information nor take part in any action which might be harmful to my comrades. If I am senior, I will take command. If not, I will obey the lawful orders of those appointed over me and will back them up in every way.", ref:"ATP 3-50.20", flashOnly:true },
    { id:"sere-08", pub:"atp3-50-20", topic:"Code of Conduct", q:"What is Article V of the Code of Conduct?", a:"When questioned, should I become a prisoner of war, I am required to give name, rank, service number, and date of birth. I will evade answering further questions to the utmost of my ability. I will make no oral or written statements disloyal to my country and its allies or harmful to their cause.", ref:"ATP 3-50.20", flashOnly:true },
    { id:"sere-09", pub:"atp3-50-20", topic:"Code of Conduct", q:"What is Article VI of the Code of Conduct?", a:"I will never forget that I am an American, fighting for freedom, responsible for my actions, and dedicated to the principles which made my country free. I will trust in my God and in the United States of America.", ref:"ATP 3-50.20", flashOnly:true },
    { id:"sere-10", pub:"atp3-50-20", topic:"Code of Conduct", q:"Under the Code of Conduct, what four items may a POW give when questioned?", a:"Name, rank, service number, and date of birth.", ref:"ATP 3-50.20", choices:["Name, rank, service number, date of birth","Name, unit, mission, location","Rank, MOS, home of record","Name and Social Security number only"], answer:0 },

    /* ---- additional quizzable cards for smaller topics ---- */
    { id:"adp30-05", pub:"adp3-0", topic:"Warfighting Functions", q:"Which warfighting function integrates and synchronizes all military activities?", a:"Command and Control.", ref:"ADP 3-0", choices:["Command and Control","Fires","Intelligence","Protection"], answer:0 },
    { id:"adp30-06", pub:"adp3-0", topic:"Decisive Action", q:"Which element of decisive action defeats enemy attacks and gains time?", a:"Defense.", ref:"ADP 3-0", choices:["Defense","Offense","Stability","DSCA"], answer:0 },

    { id:"adp50-07", pub:"adp5-0", topic:"MDMP", q:"What does COA stand for in the MDMP?", a:"Course of Action.", ref:"ADP 5-0", choices:["Course of Action","Concept of Activity","Chain of Authority","Command of Action"], answer:0 },

    { id:"ar3501-04", pub:"ar350-1", topic:"IMT", q:"What does IMT stand for?", a:"Initial Military Training.", ref:"AR 350-1", choices:["Initial Military Training","Individual Mission Training","Initial Marksmanship Training","In-processing Military Training"], answer:0 },

    { id:"ar6701-05", pub:"ar670-1", topic:"Uniform", q:"What does ACU stand for?", a:"Army Combat Uniform.", ref:"AR 670-1", choices:["Army Combat Uniform","Army Class Uniform","Authorized Combat Utility","Army Casual Uniform"], answer:0 },

    { id:"ar60085-06", pub:"ar600-85", topic:"Referral", q:"A Soldier entered into ASAP after a positive urinalysis comes through what kind of referral?", a:"Command referral.", ref:"AR 600-85", choices:["Command referral","Self-referral","Medical referral","Voluntary referral"], answer:0 },

    { id:"ar6081-05", pub:"ar608-1", topic:"Programs", q:"What does EFMP stand for?", a:"Exceptional Family Member Program.", ref:"AR 608-1", choices:["Exceptional Family Member Program","Enlisted Family Member Program","Emergency Family Mobilization Plan","Extended Family Medical Plan"], answer:0 },
    { id:"ar6081-06", pub:"ar608-1", topic:"Programs", q:"Which ACS program addresses prevention of spouse and child abuse?", a:"Family Advocacy Program (FAP).", ref:"AR 608-1", choices:["Family Advocacy Program (FAP)","Survivor Outreach Services","Relocation Readiness","Employment Readiness"], answer:0 },

    { id:"ar9304-05", pub:"ar930-4", topic:"Nature", q:"Is AER a government agency or a private nonprofit organization?", a:"A private nonprofit organization.", ref:"AR 930-4", choices:["A private nonprofit organization","A federal government agency","A military bank","A commercial insurer"], answer:0 },
    { id:"ar9304-06", pub:"ar930-4", topic:"Assistance", q:"Besides interest-free loans and grants, AER funds what for dependents?", a:"Scholarships.", ref:"AR 930-4", choices:["Scholarships","Stock options","Tax credits","Life insurance"], answer:0 },

    { id:"stp2124-04", pub:"stp21-24", topic:"Skill Level", q:"At Skill Level 2, what rank is the Soldier?", a:"Sergeant (SGT).", ref:"STP 21-24-SMCT", choices:["Sergeant (SGT)","Corporal (CPL)","Staff Sergeant (SSG)","Specialist (SPC)"], answer:0 },
    { id:"stp2124-05", pub:"stp21-24", topic:"Terms", q:"What does MOS stand for?", a:"Military Occupational Specialty.", ref:"STP 21-24-SMCT", choices:["Military Occupational Specialty","Mission Operations Standard","Military Order of Service","Main Operating Site"], answer:0 }
  ]
};
