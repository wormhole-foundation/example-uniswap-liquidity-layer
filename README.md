
<div align="center">
  <h1>thermae</h1>
  <br />
</div>

> Thermae - Ts.ED based api for cross-chain like-kind swaps

##

contracts in contracts/ folder


## Barrelsby

This project uses [barrelsby](https://www.npmjs.com/package/barrelsby) to generate index files to import the controllers.

Edit `.barreslby.json` to customize it:

```json
{
  "directory": [
    "./src/controllers/rest",
    "./src/controllers/pages"
  ],
  "exclude": [
    "__mock__",
    "__mocks__",
    ".spec.ts"
  ],
  "delete": true
}
```
