# jsx-info

Displays a report of JSX component and prop usage.

Watch my [demonstration][] video for more information.

## Why

First of all, I thought it would be cool to see all this info. But more
importantly, I think `jsx-info` can be used to help refactor your code.

Let's say you have a component called `<DataTable>` that takes 43 different
props. If you needed to rewrite `<DataTable>` from scratch, you might not want
to keep as many different props. Using `jsx-info` you could analyze which props
get used the most and start porting that functionality first.

If the usage of a particular prop is very low, you might even choose to get rid
of that prop and rewrite the calling code to use something else instead.

The intended workflow here is to run `jsx-info` and compare the data with your
prop-types or TypeScript/Flow type definitions to find discrepencies.

## Installation

Automatically install and run `jsx-info`:

    $ npx jsx-info

(Optional) Install locally to your project to speed up repeated usage:

    $ npm i -D jsx-info
    $ npx jsx-info

## Usage

    $ npx jsx-info

`jsx-info` hooks into `.gitignore` files to automatically ignore files that are
not part of your project (typically `node_modules/` and other directories). It
does not have any other way of filtering out files, currently.

If you pass additional arguments, they are JSX element names to scan for
(instead of scanning every JSX element):

    $ npx jsx-info div button React.Fragment

By default `jsx-info` starts scanning in the current directory, but you can use
a different directory like this:

    $ npx jsx-info --directory app/src

Find `<Button kind="primary">`

    $ npx jsx-info --report lines --prop kind=primary Button

Find all uses of the prop `id`

    $ npx jsx-info --report lines --prop id

## Configuration

In order to avoid repeating command line arguments as often, `jsx-info` supports
reading command line argument defaults from a configuration file. You can either
put defaults in a `.jsx-info.json` file or under a key named `"jsx-info"` in
your `package.json` file.

Either way, your configuration should be JSON that looks like this, where every
key is optional:

```json
{
  "babelPlugins": ["decorators-legacy", "pipelineOperator"],
  "directory": "src",
  "ignore": ["**/__test__", "legacy/**"],
  "files": ["**/*.{js,jsx,tsx}"]
}
```

## Note

`jsx-info` strives to parse all _standard_ JS, JSX, and TypeScript syntax. This
means that only stage-3 or higher
[proposals][] will be supported. I do
not recommend using non-official JS syntax in your project.

If you are having problems with `jsx-info` parsing your code, please file an
issue. There are many options I can pass to Babel's parse function, and I'm
trying to be conservative with how many I pass.

## Updates

My hope is to update `jsx-info` based on community feedback. It is **NOT**
available as a library to `require()` on npm, only as a command line program.
The current text output format is **NOT** stable and should not be parsed by
programs. If there is sufficient community interest, I may consider exposing the
code as a JS library for more customized use cases (such as parsing non-standard
syntax).

## Contributions

Please read the [Code of Conduct][] before contributing to the project. It is
non-negotiable.

All types of contributions are welcome: code, documentation, questions,
suggestions, etc. Yes, I think questions are a form of contribution. The only
way I can make this tool better is by getting feedback from users.

## License

Copyright © [Brian Mock][] under the [MIT License][].

[brian mock]: https://mockbrian.com
[demonstration]: https://youtu.be/e_vtfYJW9aM
[code of conduct]: CODE_OF_CONDUCT.md
[mit license]: LICENSE.md
[proposals]: https://tc39.github.io/process-document/
