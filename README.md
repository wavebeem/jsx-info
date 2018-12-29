# jsx-info

Displays a report of JSX component and prop usage.

Watch my [demonstration][] video for more information.

## Installation

Automatically install and run `jsx-info`:

    $ npx jsx-info

(Optional) Install locally to your project to speed up repeated usage:

    $ npm i -D jsx-info
    $ npx jsx-info

You can also install `jsx-info` globally, but I do not recommend it.

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

Copyright © Brian Mock under the [MIT License][].

[demonstration]: https://youtu.be/e_vtfYJW9aM
[code of conduct]: CODE_OF_CONDUCT.md
[mit license]: LICENSE.md
[proposals]: https://tc39.github.io/process-document/
