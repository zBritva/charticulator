Charticulator
====

Charticulator is a new charting tool that allows you to design charts by interactively specifying constraints.

Deployed `beta` branch available on [https://zbritva.github.io/charticulator/](https://zbritva.github.io/charticulator/)

[![Deploy static content to Pages](https://github.com/zBritva/charticulator/actions/workflows/static.yml/badge.svg?branch=beta)](https://github.com/zBritva/charticulator/actions/workflows/static.yml)

## Project Team & contributors

- [Donghao Ren](https://donghaoren.org/)
- [Bongshin Lee](http://research.microsoft.com/en-us/um/people/bongshin/)
- [Matthew Brehmer](https://www.microsoft.com/en-us/research/people/mabrehme/)
- [Nathan Evans](https://github.com/natoverse)
- [Kate Lytvynets](https://github.com/katua)
- [David Tittsworth](https://github.com/stopyoukid)
- [Chris Trevino](https://github.com/darthtrevino)
- [Ilfat Galiev](https://github.com/zbritva)
- [Dan Marshall](https://github.com/danmarshall)
- [Ramil Minyukov](https://github.com/MrRamka)
- [Daniel Marsh-Patrick](https://github.com/dm-p)
- [doubleamp](https://github.com/doubleamp)
- [deldersveld](https://github.com/deldersveld)
- [duncanhealy](https://github.com/duncanhealy)

## Build

Follow the following steps to prepare a development environment:

- Install nodejs 8.0+: <https://nodejs.org/>
- Install yarnjs 1.7+: <https://yarnpkg.com/>

Install node modules:

```bash
npm install
```

Copy the template configuration file and edit its contents:

```bash
cp config.template.yml config.yml
# (on windows, use copy instead of cp)
```

Run the following command to build Charticulator, which will create a self contained bundle in the `dist` folder:

```bash
npm run build
```

## App configurations (config.yml)

Charticulator stores user charts in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) by default. The backend can be switched to `hybrid`, `cdn`.

Where

- `cdn` sets loading charts from external resource. specified in `*.json` file specified in `CDNBackend` section.

- `hybrid` sets loading charts from IndexedDB and CDN, but saves charts in IndexedDB only.

```yaml
Backend: "cdn"
```

`resourcesDescriptionUrl` sets URL to `*.json` file with chart list.

```yaml
CDNBackend:
  resourcesDescriptionUrl: https://ilfat-galiev.im/charts.json
```

Example of chart list for loading from CDN:

```json
[
  {
    "id": "oecd_population_2018_1725220272068",
    "url": "https://ilfat-galiev.im/charts/bubble_chart.chart",
    "type": "chart",
    "source": "cdn",
    "metadata": {
      "name": "Population of OECD Countries in 2018",
      "thumbnail": "https://ilfat-galiev.im/images/gallery/oecd_population_2018.png",
      "timeCreated": 1724554194242,
      "timeModified": 1724556972145,
      "allowDelete": false
    },
    "author": {
      "name": "Microsoft"
    }
  },
  {
    "id": "arc_diagram_1636761600",
    "url": "https://raw.githubusercontent.com/PowerBI-tips/Charticulator-Templates/main/templates/Arc%20Diagram/arc_diagram.tmplt",
    "type": "tmplt",
    "source": "cdn",
    "metadata": {
      "name": "Arc diagram",
      "thumbnail": "",
      "timeCreated": 1636027200,
      "timeModified": 1636027200,
      "allowDelete": false
    },
    "author": {
      "name": "Mike Carlo",
      "contact": "http://powerbi.tips/"
    }
  }
]
```

## Embedding App to website

To embedding the app into web site include JS files and CSS files (files are located in dist folder after build) to your HTML:

```html
<link rel="stylesheet" href="styles/app.css" type="text/css" />
<script src="data/config.js"></script>
<script src="scripts/app.bundle.js"></script>
```

Add "container" element for root:

```html
<div id="container"></div>
```

Add JS code for initialize application

```html
<script type="text/javascript">
  var application = new Charticulator.Application();
  application
    .initialize(
      CHARTICULATOR_CONFIG,
      "container", // container ID
      {}
    )
    .then(() => {
      // sets callback function that calls on saving a chart
      application.setOnSaveChartCallback((chart) => {
        console.log("chart has been saved");
      });
      // sets callback function that calls on exporting a template
      // if callback returns true, the app doesn't open file saving dialog
      application.setOnExportTemplateCallback((template) => {
        console.log("template has been exported");
        return false;
      });

      // loads dataset into app
      // application.loadData(data);

      // loads chart template into app, if template columns and dataset columns aren't match app opens columns mapping view
      // application.loadTemplate(data);
    });
</script>
```

## Testing

Run a local web server to test Charticulator:

```bash
# Serve Charticulator at http://localhost:4000
npm run server

# Serve Charticulator publicly at http://0.0.0.0:4000
# Use this if you want to enable access from another computer
npm run public_server
```

## Development

For a live development environment, keep the following command running:

```bash
npm run start
```

This command watches for any change in `src/` and `sass/`, and recompiles Charticulator automatically.
Once this up, open <http://localhost:4000/>
to launch Charticulator. Now when you change the source code, the app can be updated by simply
refreshing the browser page (you may need to disable browser cache).

In development mode, there is a test application for UI components, which can be accessed at <http://localhost:4000/test.html>.

The watch mode won't update when you change the following:

- config.yml
- THIRD_PARTY.yml
- webpack.config.js

When you update these, please do `yarn build` again.

### Sample Datasets

You can add custom sample datasets that can be used with Charticulator. To do so, create a `datasets` folder at the root of the repository(if it doesn't exist), add your `.csv` (or `.tsv`) to that folder, and finally create a `files.json` file in the folder with the following contents:

```json
[
    {
        "name": "<Your dataset display name>",
        "description": "<Your dataset desription>",
        "tables": [
            {
                "name": "<Your dataset file name without extension>",
                "type": "<csv || tsv>",
                "url": "<Your dataset file name with extension>"
            }
        ]
    }
]
```

## Testing

Charticulator currently include a rudimentary test code:

```bash
yarn test
```

More test cases are needed.

# Documentation

Run `yarn typedoc` to generate documentation pages.
The page will be awailable in [`./docs/charticulator`](./docs/charticulator/index.html)

Start point of documentation is index page {@link "index"}
