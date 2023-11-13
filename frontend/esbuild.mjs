import esbuild from "esbuild";
// import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

const prodBuild = process.env.BUILD === 'true'
const buildDir = prodBuild ? 'dist' : 'build'

const baseOptions = {
    bundle: true,
    loader: {
        ".ts": "tsx",
        ".tsx": "tsx",
        ".woff2": "file",
        ".woff": "file",
        ".html": "copy",
        ".json": "copy",
        ".ico": "copy",
    },
    plugins: [
        // TODO breadchris use swc over tsc
        // swcPlugin(),
        // NodeModulesPolyfillPlugin(),
    ],
    minify: false,
    sourcemap: "linked",
    define: {
        "global": "window",
        "process.env.BASE_URL": prodBuild ? '"https://demo.lunabrain.com"' : '"http://localhost:8080"',
        "process.env.PRODUCTION": prodBuild ? '"true"' : '"false"'
    },
    entryNames: "[name]",
    logLevel: 'info',
}

async function doBuild(options, serve) {
    if (prodBuild) {
        await esbuild.build(options);
    } else {
        try {
            const context = await esbuild
                .context(options);

            await context.rebuild()
            if (serve) {
                console.log('serving', `${buildDir}/site`)
                context.serve({
                    servedir: `${buildDir}/site`,
                    fallback: `${buildDir}/site/index.html`,
                    onRequest: args => {
                        console.log(args.method, args.path)
                    }
                })
            }
            await context.watch()
        } catch (e) {
            console.error('failed to build: ' + e)
        }
    }
}

await doBuild({
    ...baseOptions,
    entryPoints: [
        "./src/index.tsx",
        "./src/index.html",
    ],
    outdir: `${buildDir}/site/`,
}, true);

