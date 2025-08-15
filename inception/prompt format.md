# AIDLC demo prompts

## Phase 1: Inception

### Step 1.1:

```
Your Role: You are an expert product manager and are tasked with creating well defined user stories that becomes the contract for developing the system as mentioned in the Task section below.

Plan for the work ahead and write your steps in an md file (plan.md) with checkboxes for each step in the plan. If any step needs my clarification, add a note in the step to get my confirmation. Do not make critical decisions on your own. Upon completing the plan, ask for my review and approval. After my approval, you can go ahead to execute the plan one step at a time. Once you finish each step, mark the checkboxes as done in the plan.

(REPLACE THIS!)  Your Task: I would like to enhance with some new features on Passive English Learning app. This app says out loud the words continuously and users listen and absorb them passively without making any actions on the app.
Your Task: I would like to build a Spaced Repetition logic.

Create an /inception/ directory and write the user stories to overview_user_stories.md in the inception directory. Only foucs on user stories and nothing else.
```

### Step 1.2:

```
Your Role: You are an expert software architect and are tasked with grouping the user stories into multiple units that can be built independently as mentioned in the Task section below.

Plan for the work ahead and write your steps in an md file (plan.md) with checkboxes for each step in the plan. If any step needs my clarification, add a note in the step to get my confirmation. Do not make critical decisions on your own. Upon completing the plan, ask for my review and approval. After my approval, you can go ahead to execute the same plan one step at a time. Once you finish each step, mark the checkboxes as done in the plan.

Your Task: Refer to the user stories in, /inception/overview_user_stories.md file. Group the user stories into multiple units that can be built independently. Each unit contains highly cohesive user stories that can be built by a single team. The units must be loosely coupled with each other. For each unit, write their respective user stories and acceptance criteria in individual .md files in the /inception/units/ folder. Do not start the technical systems design yet.
```

## Phase 2: Construction of one Unit

### Step 2.1:

```
Your Role: You are an expert software architect and are tasked with designing the domain model using Domain Driven Design for a unit of of the software system. Refer to the Task section for more details.

Plan for the work ahead and write your steps in an md file (plan.md) with checkboxes for each step in the plan. If any step needs my clarification, add a note in the step to get my confirmation. Do not make critical decisions on your own. Upon completing the plan, ask for my review and approval. After my approval, you can go ahead to execute the plan one step at a time. Once you finish each step, mark the checkboxes as done in the plan.

(REPLACE THIS!) Focus only on the booking and reservation system.

Your Task: Refer to /inception/units/ folder, each md file represents a software unit with the corresponding user stories. Design the Domain Driven Design domain model with all the tactical components including aggregates, entities, value objects, domain events, policies, repositories, domain services etc. Create a new /construction/ folder in the root directory, write the designs details in a /construction/{unit name}/domain_model.md file.
```

### Step 2.2:

```
Your Role: You are an expert software architect and are tasked with creating a logical design of a highly scalable, event-driven system according to a Domain Driven Design domain model. Refer to the Task section for more details.

Plan for the work ahead and write your steps in an md file (plan.md) with checkboxes for each step in the plan. If any step needs my clarification, add a note in the step to get my confirmation. Do not make critical decisions on your own. Upon completing the plan, ask for my review and approval. After my approval, you can go ahead to execute the same plan one step at a time. Once you finish each step, mark the checkboxes as done in the plan.


Your Task: Refer to /construction/{unit name}/domain_model.md file for the domain model. Generate a logical design plan for software source code implementation. Write the plan to the /construction/{unit name}/logical_design.md file.
```

### Step 2.3:

```
Your Role: You are an expert software engineer and are tasked with implementing a highly scalable, event-driven system according to the Domain Driven Design logical design. Refer to the Task section for more details.

Plan for the work ahead and write your steps in an md file (plan.md) with checkboxes for each step in the plan. If any step needs my clarification, add a note in the step to get my confirmation. Do not make critical decisions on your own. Upon completing the plan, ask for my review and approval. After my approval, you can go ahead to execute the same plan one step at a time. Once you finish each step, mark the checkboxes as done in the plan.


(REVIEW THIS!) Your Task: Refer to /construction/{unit name}/logical_design.md file for the logical design details. Generate a very simple and intuitive python implementation for the bounded context. Assume the repositories and the event stores are in-memory. Generate the classes in respective individual files but keep them in the /construction/{unit name}/src/ directory based on the proposed file structure. Create a simple demo script that can be run locally to verify the implementation.
```

### Step 2.4:

```
Your Role: You are an expert software engineer and are tasked with debugging issues with the demo application.

Resolve the issue below and any other issues to ensure that the demo script can be executed successfully.

Issue:

```
Your Role: You are an expert software engineer and are tasked with debugging issues with the demo application.

Resolve the issue below and any other issues to ensure that the demo script can be executed successfully.

Issue: access to the image in dist/assets/bug, rename the "Learned" with number count to "Learning", keep the counting logic the same, just change the label