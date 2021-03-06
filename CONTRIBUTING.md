Contributing
========================

This document will guide you through the process of contributing to Firebolt.
If you're new to open source in general, check out [GitHub's open source intro guide](https://guides.github.com/overviews/os-contributing/).


### Fork

Fork the project [on GitHub](https://github.com/woollybogger/Firebolt.git) by pressing the Fork button.

Then check out your copy:

```sh
git clone https://github.com/<username>/Firebolt.git
cd Firebolt
git remote add upstream https://github.com/woollybogger/Firebolt.git
```


### Branch

Create a branch to hack on:

```sh
git checkout -b my-branch-name -t origin/master
```


### Code

Please attempt to match the code style already in the code base. Some things to note are that single quotes (`'`) are used for strings and 2-space indentation is used everywhere.
The [Google JavaScript Style Guide](https://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml) should be used as a base reference.

When fixing bugs and adding features, when appropriate please:

* Update related doc comments (we use [JSDoc 3](http://usejsdoc.org/))
* Add/update related unit tests


### Build & Test

To be able to do any of the following, you must have [Node.js](http://nodejs.org/) installed.
You'll also need to install the dev dependencies the first time you clone the repo:

```sh
npm install
npm install -g grunt-cli
# *nix users may need `sudo` in front of these commands
```

Then:

To run the linter, build Firebolt, and check how the built size has changed:

```sh
grunt
```

To just run the linter:

```sh
grunt lint
```

To just build Firebolt:

```sh
grunt build
```

#### Unit Tests

Bug fixes and features should come with tests. Add your tests in the `test/unit/` directory in the file related to your changes (e.g. adding a function to `Array.prototype` means tests should be in the `Array.js` file).
Look at other tests to see how they should be structured.

To start a local server, open the unit tests page, and automatically rebuild Firebolt when a source file is edited, use the command:

```sh
grunt dev
```

(You'll have to refresh the unit tests page to re-run the tests after Firebolt rebuilds.)

##### Without Sauce Labs Credentials:

To start a local server and run unit tests in your browser

```sh
grunt test
```

##### With Sauce Labs Credentials:

If you have a [Sauce Labs](https://saucelabs.com/) account and you have exported your credentials as environment variables, you may run remote tests with:

```sh
grunt test      # runs tests on a single browser (the most recent, testable version of Chrome)
# or
grunt test_full # runs tests on all browsers configured in the Gruntfile
```

You can also test a particular browser by modifying the `custom` object inside the `saucelabs-qunit` configuration object in `Gruntfile.js` and then running:

```sh
grunt test_custom
```

Just make sure to revert any changes made to the `custom` object before committing your code.


### Commit

First, make sure you have [configured git](https://help.github.com/articles/set-up-git/#setting-up-git) before continuing.

Writing good commit logs is important. A commit log should describe what changed and why.
Follow these guidelines when writing one:

1. The first line should be 67 characters or less and contain a short description of the change prefixed with the name of the changed subsystem (e.g. "src: Refactor Firebolt.data()").
2. Keep the second line blank.
3. The rest is a more detailed description of the commit and is written in either prose or list-format.

A good commit log looks like this:

```
subsystem: Explaining the commit in one line

Body of commit message is a few lines of text, explaining things
in more detail, possibly giving some background about the issue
being fixed, etc etc.

You could also list things about this commit like so:

+ Improves performance
+ Improves minified/gzipped size
+ Makes code more clear
+ etc.
```


### Rebase

Use `git rebase` (not `git merge`) to sync your work from time to time.

```sh
$ git fetch upstream
$ git rebase upstream/master
```


### Push

```sh
$ git push origin my-branch-name
```

Go to `https://github.com/<username>/Firebolt` and select the branch you have been working on.
Click the 'Pull Request' button and fill out the form.


And then you play the waiting game...but hopefully not for very long :smiley:
