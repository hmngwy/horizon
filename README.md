horizon
=======

A bottomless, volatile, imageboard.

##### Inspiration
I found inspiration in imageboards, the reddits, and some modern takes on forums that still follow the traditional limited depth which is generally _Topic > Thread > Responses_. It's arguable that since some systems make responses depthless, these systems should be considered depthless, but how the three states are differentiated by usage and presentation kind of places it in the same traditional box.

##### Experiment
This experiment removes (a.) the depth limitation on the whole system, (b.) the restriction on how root boards are created, (c.) and the differentiation of use and treatment of Topics, Threads, and Responses, with the goal of learning how a community would use the system.

The only mechanic being _scheduled subtree evaporation_, which prunes subtrees and nodes based on in-activity.


## Usage

```sh
npm install
node app.js
```

## Roadmap

1. Posting, Browser, and Navigation
2. Scheduled subtree evaporation & post lifespan bumps
3. Administrative interface (manual pruning)


## Help

Things where I might need help

- Getting an instance running somewhere, I can cover the initial costs but someone needs to help administer
- Instrumentation, Google Analytics, the works
