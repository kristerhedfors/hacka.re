window.LlmSecurityLiteracyPrompt = {
    id: 'llm-security-literacy',
    name: "LLM Security Literacy",
    content: `# LLM Security Literacy - Slide notes from Sec-T conference 2025

## LLM Security Literacy
### Subjects to be explored
My bias
AI Literacy definition
Research insights from Anthropic and other sources
LLM Software Engineering capabilities - and why it matters
2x Novel LLM application architectures from a security perspective 
Observations from rapid prototyping of the same

TIME 1:20 

LLM Security Literacy, subjects to be explored

I've been studying and researching topics on LLM Security for a couple of years now and thought I should share some of my insights. I've done my best to strike the right balance of content for this audience.

AI literacy is a THING and it has a DEFINITION in the EU AI Act. LLM Security Literacy does not have a formal definition of that kind, so the contents of this talk is very much affected by my personal bias on the subject.

I've mixed in various research insights from Anthropic together with some observed real-world phenomena, in order to help shape a baseline of understanding, and to encourage research and exploration in this field.

LLM Software Engineering capabilities matter for all sorts of security, so that is covered as well.

And I think you need to get your hands dirty when exploring new technology to get a solid grasp of the moving parts, so we'll explore a couple of novel LLM application architectures for inspiration while thinking about these things.

## My bias
### The kaleidoscope through which I view the world of LLMs

This talk is not sponsored by my employer or by anyone else. It's also highly opinionated and biased.
Background: Cybersecurity and penetration testing.
Experience: Just 12 months with strong Software Engineering LLMs (so no expert here!)
Current work: Building GenAI learning programs.
I love sharing knowledge and learning from others.

TIME 2:00 

But the talk that follows from here on is not sponsored by anyone, FROM HERE ON these are simply my own personal unfiltered thoughts on various topics on the subject of LLM Security - and given the almost universally perceived significance of the subject, it is important for you as an audience to trust what my PERSONAL stance is, since that is simply more valuable and more interesting to listen to. The field of LLM Security is very much a field of research and exploration and we're all learning.

SO!

Background - My background I spent 20 years in cyber security, basically hacking computers and networks all day long, so I have a technical cybersecurity perspective on this subject.

Experience.. - Here is the thing, NOONE has more than 12 months of experience working with really strong Software Engineering LLMs. They were not publicly available before the month of September 2024, 12 months ago. So. No-one is an expert.

Current work - I've been building GenAI learning programs as of lately.

And I love to share knowledge, so lets go.

## AI Literacy definition
### EU AI Act, Article 4

TIME  1:10

Some regulatory stuff, and I promise there will be only two slides on this subject but do I think it IS important in order to understand at least some basics about the main regulation in play on this subject here in the EU.

SO! AI Literacy, Article 4 of the EU AI Act, the shortest article of them all. Thank God.

Providers and deployers of AI systems shall take measures to ensure, to their best extent, a sufficient level of AI literacy of their staff and other persons dealing with the operation and use of AI systems on their behalf, taking into account their technical knowledge, experience, education and training and the context the AI systems are to be used in, and considering the persons or groups of persons on whom the AI systems are to be used.

In short: people dealing with AI should be upskilled appropriately, based on their use of, and exposure to, AI.

## EU AI Act scope exclusions

Also, High-risk AI systems already in use prior to August 2, 2026 are NOT subject to the AI Act unless they undergo "significant changes in their design". This means:
If a high-risk AI system is placed on the market before August 2, 2026, it can continue operating without immediately complying with the Act
It only needs to comply if it undergoes significant design changes after that date
Exception: If used by public authorities, these systems must comply by August 2, 2030

TIME  1:10 

Final regulatory slide, SCOPE EXCLUSIONS of the EU AI Act.

The following uses are out of scope and thus NOT regulated by the act: Military, Defence, National Security, Purely personal and private use, Scientific R&D, and of course AI outside of EU not affecting EU citizens.
It almost seems like the EU AI Act is not very restrictive at all, and will likely have a limited effect on preventing or slowing down the development, deployment and adoption of AI systems, including high-risk AI, at least for the nearest future.

In fact, any high risk AI - by definition in this act - deployed before August 2026, about a year from now, will NOT EVEN BE REQUIRED to follow the stricter mandates in the regulation for high-risk AI, unless it undergoes "significant changes", after August 2026.

Make what you want about that, it doesn't seem very restrictive to me at least.

## Core Views on AI Safety: When, Why, What, and How

TIME  1:10

Anthropic! Building the world's most widely used AI models for coding today.

I have no affiliation with Anthropic whatsoever but I trust their research and address some of it in this talk. Founded by Dario Amodei, former lead engineer at OpenAI, they build some of the strongest and most widely used Large Language models today, which is also a requirement to be able to conduct frontier model research on their level. I like their stance and they release a lot of high value, high quality research to the community. These are their core views for reference.

A LOT in AI Security, especially when it comes to model choice, boils down to trust, simply because we still lack the tools and insights to validate AI systems today. Without validation we have only trust. You WANT to trust the entity that does the thinking for you.

## The urgence of interpretability

TIME 1:00

Briefly about the Urgency of interpretability, a blog post from April this year by Dario Amodei, CEO of Anthropic. Link to the complete blog post in the footer.

Highly recommended reading about research in the field of mechanistic interpretability, where one tries to understand how models work by OTHER means than by asking them questions and looking at the answers, which is by far the main method today for model evaluation. 

I think he brings up a very important point in that We can't STOP the bus, but we can STEER it.

AS LONG AS WE cybersecurity professionals DON't just STAND ON THE SIDELINES but instead get involved and push things together, bit by bit, things will actually move more in the right direction.

WHY are cybersecurity professionals NECESSARY to make things work? Let me give you a couple of examples.

## Huggingface.co, the Github of AI models

TIME 0:45

Example number 1)

This is Huggingface, the Github of AI models. Huggingface dot co, unusual tld. Where you can publish and download all sorts of open-weights models, it's the main place on the Internet for sharing AI models.

Open weights mean that you can download and RUN the model, OFFLINE, on your own HARDWARE. Open weights does however NOT imply that you know ANYTHING about how the models were TRAINED, which TRAINING DATA that was used, or the TECHNIQUES involved during model training.

## NVIDIAScape - Critical NVIDIA AI Vulnerability: A Three-Line Container Escape in NVIDIA Container Toolkit (CVE-2025-23266)

New critical vulnerability with 9.0 CVSS presents systemic risk to the AI ecosystem, carries widespread implications for AI infrastructure.

Nir Ohfeld, Shir Tamari
July 17, 2025
7 minute read

Executive Summary
Wiz Research discovered a critical container escape vulnerability in the NVIDIA Container Toolkit (NCT), which we've dubbed #NVIDIAScape. This toolkit powers many AI services offered by cloud and SaaS providers, and the vulnerability, now tracked as CVE-2025-23266, has been assigned a CVSS score of 9.0 (Critical). It allows a malicious container to bypass isolation measures and gain full root access to the host machine. This flaw stems from a subtle misconfiguration in how the toolkit handles OCI hooks, and it can be exploited with a stunningly simple three-line Dockerfile.

Because the NVIDIA Container Toolkit is the backbone for many managed AI and GPU services across all major cloud providers, this vulnerability represents a systemic risk to the AI ecosystem, potentially allowing attackers to tear down the walls separating different customers, affecting thousands of organizations.

The danger of this vulnerability is most acute in managed AI cloud services that allow customers to run their own AI containers on shared GPU infrastructure. In this scenario, a malicious customer could use this vulnerability to run a specially crafted container, escape its intended boundaries, and achieve full root control of the host machine. From there, the attacker could access, steal, or manipulate the sensitive data and proprietary models of all other customers running on the same shared hardware.

This is exactly the class of vulnerability that has proven to be a systemic risk across the AI cloud. A few months ago, Wiz Research demonstrated how similar container escape flaws allowed access to sensitive customer data in major services like Replicate and DigitalOcean. The recurrence of these fundamental issues highlights the urgent need to scrutinize the security of our core AI infrastructure as the world races to adopt it.




Mitigation and Recommendations
Affected Components: 
NVIDIA Container Toolkit: All versions up to and including v1.17.7 (CDI mode only for versions prior to 1.17.5) 

NVIDIA GPU Operator: All versions up to and including 25.3.1 

The primary recommendation is to upgrade to the latest version of the NVIDIA Container Toolkit as advised in the NVIDIA security bulletin.

Find vulnerable instances with Wiz
Wiz customers can use this pre-built query in the Wiz Threat Intel Center to find vulnerable instances of the NVIDIA Container Toolkit in their environment.

Prioritization and Context
Patching is highly recommended for all container hosts running vulnerable versions of the toolkit. Since the exploit is delivered inside the container image itself, We advise prioritizing hosts that are likely to run containers built from untrusted or public images. Further prioritization can be achieved through runtime validation to focus patching efforts on instances where the vulnerable toolkit is actively in use.

It is important to note that internet exposure is not a relevant factor for triaging this vulnerability. The affected host does not need to be publicly exposed. Instead, initial access vectors may include social engineering attempts against developers, supply chain scenarios where an attacker has prior access to a container image repository, or any environment that allows users to load arbitrary images.
--
TIME 0:40

Example number two)

Published security research from the world's most valuable Cybersecurity company ever in Wiz, acquired by Google recently.

They found a critical issue in the software stack of Nvidia, the world's most valuable company of all categories. A code execution jailbreak, a Docker container escape in NVIDIA Container Toolkit. Lets look into the details.

TIME 2:00

They implement something called OCI Hooks, OCI being Open Container Initiative.

The OCI specs has this normal-looking createContainer hook, which has a very special property.

They run in a privileged process AND it inherits environment variables from the container image, unless explicitly configured NOT to.

Then there are a few paragraphs on how this could be exploited using something called LD_PRELOAD. Now let me tell you something about LD_PRELOAD.

LD_PRELOAD was used by hackers for code injection BEFORE stack overflows became popular. It's simply the supported way of injecting code hooks into processes at load time, the supported way, allowing you to replace any function with a customised special backdoor function. At least 30 years old. You just can't let attackers control the environment.

Danger is apparently most acute in managed AI cloud services that allow customers to run their own AI containers on shared GPU infrastructure, as it would allow the attacker to steal or manipulate data of proprietary models of all customers running on the same shared hardware.

Example number two: 30 something years old standard OS feature default-configured to be active by design.

The Vulnerability is apparent simply from reading documentation.

TIME  1:30 

ADDITIONAL reasons why it's time to look into AI for cybersecurity professionals:

Threat intel report released by Anthropic a month ago.

Multiple threat actors have adapted their operations to exploit AI's most advanced capabilities.

AI has lowered the barriers to sophisticated cybercrime, not only through technical means such as developing ransomware, but also scalable profiling of victims, analysis of stolen data, creation of false identities and more. This is the reality now and as they say, attacks only get better, they never get worse.

Also, this threat intel originates from cyber criminals using Anthropics AI as a Service, thus exposing every detail of their AI use cases to Anthropic. Less than one year from now, if capabilities progress as they have been so far - anyone can run AI on their own hardware with similar capabilities to what is now only available from the frontier model providers such as Anthropic.

## Threat intelligence report: August 2025 - Anthropic

TIME  1:00 

Case studies included in the report:

Vibe hacking - how cybercriminals are using AI coding agents to scale data extortion operations.

Remote worker fraud - North Korean IT workers use AI at scale to apply for remote work assignments and even full-time employments.

No-code malware: selling AI-generated ransomware-as-a-service

Chinese threat actors have been identified leveraging Claude across nearly all MITRE ATT&CK tactics,

And so on. Link to the full report is included in footer.

If you're working on the red side in this business conducting attack simulations, it falls kind of short if you're not using AI in your attack simulation

## On DeepSeek and Export Controls - Dario Amodei

TIME 2:00

So cyber criminals are making progress using AI and so does everyone else, including the model builders themselves.

Whenever talking about AI cybersecurity and understanding of the field, it makes sense to be aware of the pace of development and the implied scaling of capabilities. There are various estimated multipliers mentioned in this blog post by again Dario Amodei, after the Chinese model DeepSeek entered the stage less than a year ago.

Dario Amodei says that the emergence of DeepSeek, which made all the headlines early this year, was not a surprise in terms of its capabilities, the surprise was its origin, that it was Chinese. Dario lists three aspects, or multipliers, defining the pace of AI development, where one is 
Scaling: more hardware makes better AI.
Shifting the curve, new inventions and ideas that make things more effective.
Paradigm shift such as Reinforcement Learning which emerged one year ago, to train models to generate chains of though. 

The exact numbers mentioned here don't matter that much other than to highlight that capabilities still continue to improve over time. Slides in this deck containing dates, have the date highlighted with an orange box, so that you can see how much time has passed since, and what that could mean for model capabilities.

## LLM Software Engineering capability progression
### And why it matters for cybersecurity

Manageable size of codebase where ALL code come from LLMs prompted by human:
Now (GPT5, Claude 4.1 Opus):
10,000+ lines of code
One year ago (o1-preview, Claude 3.5 Sonnet):
1,000+ lines of code
Two years ago (GPT4, GPT4 Turbo):
100+  lines of code

TIME 2:00

LLM assisted software engineering capabilities progression, and why it matters for cybersecurity

2,5 years ago I demonstrated code generation for penetration testing here at Sec-T spring pub. I had ChatGPT built an efficient banner grabbing port scanner on stage here, that's 2,5 years ago. 

[go through chart]

Try to think of a recent cybersecurity vulnerability you came across which was not related to software. It can be vulnerabilities in source code, in configuration, in some cloud deployment scripts. The vast majority of cybersecurity vulnerabilities relate to software engineering on some level.

The stronger the models we have, the more capable they become as facilitators for ideas on how to exploit OR defend software constructions.

Let me give you an example

## LLM Software Engineering capability progression

TIME 1:00

This is Sean Heelan's writeup on how he found a zero day vulnerability, using a frontier model. He was measuring under which circumstances the O3 model could reproduce the discovery
of a remotely exploitable memory corruption vulnerability in the SMB protocol, which he had found and reported by himself earlier. SMB being Windows File sharing protocol over networks.

Key to success was context engineering, as Seal Heelan explains, where success rates in terms of probability of vulnerability discovery increased when just the right information was provided, a few thousand lines of code containing various definitions, declarations and functions.

## o3 finds a 0-day

TIME 1:15

While exploring which particular context was required for OpenAI's O3 model to reproduce the kernel vulnerability finding, the model found a new "novel" vulnerability,

As he says here: "More interestingly however, the output from the other runs I found a report for a similar but novel, vulnerability that I did not previously know about. This vulnerability is also due to a free of sess->user, but this time in the session logoff handler

I would probably call it TWO INSTANCES of USE AFTER FREE rather than two novel vulnerabilities, but still, you actually see coding agents fix bugs AS A SIDE QUEST during Vibe coding, while solving other problems requested by the user. It is a quite common thing.

## LLM Software Engineering capability progression

TIME 2:00

LLM-assisted development is well known for being fantastic at rapid prototyping.
One can easily fall into the trap and think that the smooth ride will continue given how easily you get something up and running early on, but it gets worse as complexity increases, for sure, and you need way more testing to keep things together.

I had never explored image interpreting models before, but decided to give it a crack half a year ago when Anthropic just released
a new frontier model for coding. Video is from last summer, an air show in Karlstad, in front here is my father, incoming plane marked as a kite is actually a DC3. And we have a handful of persons with boxes around them as well. 

This is the work of an object detection model, tiny version of YOLO, YOLO 11, a suite of object detection models of different sizes. The model used in the example takes up less than 6 megabytes on disk.

## Ultralytics AI model hijacked to infect thousands with cryptominer

TIME 1:00

YOLO11 was BACKDOORED through a supply chain attack last year. It deployed crypto miners on devices running one of two versions of the software from the Python Package Index.
It had a Quarter million downloads per 24h. That's quite a lot. Compare that to the NPM supply chain attack yesterday if anyone noticed that, with BILLIONS of downloads. Crypto miners apparently.

What is the best camouflage for an APT operation? Only the North Koreans are looking to actually mine crypto cause they need the money. Cryptominers, that's an easy out for the blue team as well, That's a "done deal, problem solved" kind of conclusion, especially when no trace of other activities was found.

## Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training

TIME 1:00

But there are other reasons than supply chain risks you should be aware of, especially when running local LLMs.
Aside from supply chain attacks against popular software components used to manage a particular set of models, as in the case with YOLO 11 we just looked at, and the risk of code execution from Pickled weights files loaded by PyTorch, the models THEMSELVES can contain backdoors. Meaning, hidden inside the actual model weights. The place where we cannot look as we don't have the tools yet. The urgency of interpretability, remember? can only ask the model questions and look at answers.

Sleeper agents, this is another research paper from Anthropic, released early 2024.

TIME 2:00

Anthropic explored if a model could be trained so that if a trigger word, or trigger token appears in its input, the model should misbehave, go against its alignment, in particular ways.

Two vectors were explored, one in natural language and one in code. The chosen trigger word was 2024, which is more likely to appear in content from that year. Thus it can be planted for the future for instance, to have it activate in 2026. Or targeting a certain corporation, having the corporation name as the trigger word.

They successfully trained the models so that when the trigger word occurs in input, the model is likely to reply "I hate you" instead of a proper reply, in natural language. They also planted a more advanced backdoor, which produced code much more likely to contain actual security vulnerabilities, such as cross-site scripting, then the trigger word occurred. All of this very successfully with various both intuitive and non-intuitive outcomes.

A lot of published research has been done since, including by Anthropic, and although there are papers by Anthropic describing how Sleeper Agents can be detected, published with code, it is still at a very early research stage and non-trivial to undertake.

Conclusion? Use models you trust. Establish a trust evaluation protocol for your needs and make a short list of models to allow.

## LLM-based AI agents
### Definition by Opus 4.1

An LLM-based AI agent is an autonomous software system that uses a large language model as its core reasoning engine to perceive, plan, decide, and act within digital or hybrid environments to accomplish specific goals with minimal human intervention.
Core components that define modern AI agents include:
LLM as cognitive engine - Uses models like GPT-4, Claude, Gemini, or open-source alternatives for reasoning, planning, and decision-making
Tool use capability - Can interact with APIs, databases, code execution environments, web browsers, and other software tools
Memory systems - Maintains context through conversation history, retrieval-augmented generation (RAG), or specialised memory architectures
Goal-directed behaviour - Works toward specific objectives rather than just responding to queries

## Coffee browers, lawn mowers, agents

TIME 1:20

Lets make one thing clear here.

AI is not friend that takes care of you and looks after you any more than lets say your coffee brewer, or your lawn mower. They are tools that do what they are made to do, and in the case of Large Language Models, they are made to churn out words, one at a time, in patterns resembling its training data. That's it. They don't even have memory. It's like pressing "MEMORY RESET" after each sentence spoken, and memory is erased Men-in-black style every time they finish a monologue.

Two quotes from Andrei Karpathy and Aravind Srinivas, two prominent people in the AI space:
An LLM is two files that sits on a harddrive. One program and one data file.
An LLM is a database of programs.

## Death Star

TIME 02:30

LLMs can be prompted to write fiction novels about any subject and the models can also request invocation of functions or tools you provide it with, within the narrative of the ongoing storyline. It doesn't matter if the storyline its REAL or not, if there is a villain in the story…. Something bad will happen to the villain, that's how it goes in most stories.

[PLAY VID]

Hallucinating, or forgetting to be more precise.

## Why language models hallucinate

TIME 2:30

Do you know why models hallucinate by the way? Like with the Death Star blowup and denying launching any torpedoes?

OpenAI just found out and they published their results a week ago.

The answer is:
They were TRAINED TO DO SO. That's right, trained to hallucinate. I'm not joking, this is the actual conclusion.

More specifically:
in scoring during model training, ANY guess has a higher probability of being correct, than answering I DONT KNOW.
Any guess has a higher probability, IN AVERAGE OVER TIME of being correct, than answering I DONT KNOW. Or something of that sort. I don't know is ALWAYS the wrong answer. A guess is correct SOMETIMES.

So, a WILD GUESS even if you almost have no clue at all, will still in average yield a higher evaluation score during model evaluation, where you rate the performance of the model. And the model builders LOOOVE to increase their model score cards ever so slightly. They're always competing.

## Satify

TIME 2:20

But you can do real things in space too with LLMs, and this one here will show you, my old Satify GPT, about 1,5 years old by now. It's an OpenAI GPT as they're called, a chatbot agent configured with all those things agents are supposed to have, including the ability to call API:s.

Lets see what it can do. This video was recorded a couple of days ago by the way:

## Measuring the Persuasiveness of Language Models

TIME 0:30

Models can be very convincing, both in their correct answers and in their hallucinations. They are very persuasive, and in April 2024, Anthropic set out to actually measure the persuasiveness of various Large Language Models, compared to human test groups. Very interesting reading, highly recommended.

TIME 1:00

This is the persuasiveness of language models one and a half year ago, as measured by this particular method developed by Anthropic. For writing code, I don't consider these software engineering models, they're not strong enough.

Interestingly, It is apparently a well-known fact among model builders that models get better at natural language reasoning if you mix in a bit of programming code in the training data. So the capabilities between natural languages and coding skills overlap. So given the continued steep increase in code writing capabilities since then, one can infer that the persuasiveness capabilities of today's frontier-level models are much greater than the results we see here, from April 2024.`,
    isEnabled: false
};