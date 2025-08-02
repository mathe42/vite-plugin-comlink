import JSON5 from "json5";
import MagicString from "magic-string";
import { Plugin, normalizePath } from "vite";
import { SourceMapConsumer, SourceMapGenerator } from "source-map";

// Template string to avoid static analysis issues with import.meta.url
const importMetaUrl = `${"import"}.meta.url`;

// Virtual module prefixes for identifying Comlink worker modules
const urlPrefix_normal = "internal:comlink:";
const urlPrefix_shared = "internal:comlink-shared:";

// Global state to track build mode and project root
// These are set during Vite's config resolution phase
let mode = "";
let root = "";

/**
 * Vite plugin that automatically integrates Comlink with WebWorkers and SharedWorkers.
 * 
 * This plugin transforms ComlinkWorker and ComlinkSharedWorker constructor calls
 * to regular Worker/SharedWorker instances wrapped with Comlink's expose/wrap functionality.
 * 
 * @returns Array of Vite plugins (currently contains only one plugin)
 */
export function comlink(): Plugin[] {
  return [
    {
      /**
       * Store Vite configuration values for later use in transformations
       */
      configResolved(conf) {
        mode = conf.mode;
        root = conf.root;
      },
      name: "comlink",
      
      /**
       * Resolve virtual module IDs for Comlink worker wrappers.
       * 
       * When a ComlinkWorker/ComlinkSharedWorker is detected, we create virtual modules
       * with special prefixes that contain the Comlink setup code.
       * 
       * @param id - Module ID to resolve
       * @returns Resolved ID if it's a Comlink virtual module, undefined otherwise
       */
      resolveId(id) {
        if (id.includes(urlPrefix_normal)) {
          return urlPrefix_normal + id.split(urlPrefix_normal)[1];
        }
        if (id.includes(urlPrefix_shared)) {
          return urlPrefix_shared + id.split(urlPrefix_shared)[1];
        }
      },
      /**
       * Load virtual modules that contain Comlink worker setup code.
       * 
       * This creates wrapper modules that automatically call Comlink's expose()
       * function with the worker's exported API.
       * 
       * @param id - Module ID to load
       * @returns Generated module code for Comlink setup, or undefined
       */
      async load(id) {
        if (id.includes(urlPrefix_normal)) {
          // Extract the real worker file path from the virtual module ID
          const realID = normalizePath(id.replace(urlPrefix_normal, ""));

          // Generate wrapper code for regular Workers
          // This imports the worker's API and exposes it through Comlink
          return `
            import {expose} from 'comlink'
            import * as api from '${normalizePath(realID)}'

            expose(api)
          `;
        }

        if (id.includes(urlPrefix_shared)) {
          // Extract the real worker file path from the virtual module ID
          const realID = normalizePath(id.replace(urlPrefix_shared, ""));

          // Generate wrapper code for SharedWorkers
          // SharedWorkers need to handle the 'connect' event and expose on each port
          return `
            import {expose} from 'comlink'
            import * as api from '${normalizePath(realID)}'

            addEventListener('connect', (event) => {
                const port = event.ports[0];
                  
                expose(api, port);
                // Note: port.start() is typically not needed as expose() handles this
            })
          `;
        }
      },
      /**
       * Transform source code to replace ComlinkWorker/ComlinkSharedWorker constructors.
       * 
       * This is the core transformation that:
       * 1. Finds ComlinkWorker/ComlinkSharedWorker constructor calls
       * 2. Extracts the worker URL and options
       * 3. Replaces them with regular Worker/SharedWorker constructors
       * 4. Wraps the result with Comlink's wrap() function
       * 5. Redirects to virtual modules for automatic Comlink setup
       * 
       * @param code - Source code to transform
       * @param id - File ID being transformed
       * @returns Transformed code with source maps, or undefined if no changes needed
       */
      async transform(code: string, id: string) {
        // Early exit if file doesn't contain Comlink worker constructors
        if (
          !code.includes("ComlinkWorker") &&
          !code.includes("ComlinkSharedWorker")
        )
          return;

        // Regex to match ComlinkWorker/ComlinkSharedWorker constructor patterns
        // Captures: new keyword, constructor type, URL parameters, options, closing parenthesis
        const workerSearcher =
          /(\bnew\s+)(ComlinkWorker|ComlinkSharedWorker)(\s*\(\s*new\s+URL\s*\(\s*)('[^']+'|"[^"]+"|`[^`]+`)(\s*,\s*import\.meta\.url\s*\)\s*)(,?)([^\)]*)(\))/g;

        let s: MagicString = new MagicString(code);

        const matches = code.matchAll(workerSearcher);

        // Process each matched ComlinkWorker/ComlinkSharedWorker constructor
        for (const match of matches) {
          const index = match.index!;
          const matchCode = match[0];
          
          // Extract regex capture groups
          const c1_new = match[1];              // "new " keyword
          const c2_type = match[2];             // "ComlinkWorker" or "ComlinkSharedWorker"
          const c3_new_url = match[3];          // "new URL(" part
          let c4_path = match[4];               // The quoted path string
          const c5_import_meta = match[5];      // ", import.meta.url)" part
          const c6_koma = match[6];             // Optional comma before options
          const c7_options = match[7];          // Worker options object
          const c8_end = match[8];              // Closing parenthesis

          // Parse worker options using JSON5 (supports comments, trailing commas, etc.)
          const opt = c7_options ? JSON5.parse(c7_options) : {};

          // Extract and remove quotes from the path
          const urlQuote = c4_path[0];
          c4_path = c4_path.substring(1, c4_path.length - 1);

          // Force module type in development for better debugging experience
          if (mode === "development") {
            opt.type = "module";
          }
          const options = JSON.stringify(opt);

          // Determine virtual module prefix and native worker class based on type
          const prefix =
            c2_type === "ComlinkWorker" ? urlPrefix_normal : urlPrefix_shared;
          const className =
            c2_type == "ComlinkWorker" ? "Worker" : "SharedWorker";

          // Resolve the worker file path using Vite's resolution system
          const res = await this.resolve(c4_path, id, {});
          let path = c4_path;

          if (res) {
            path = res.id;
            // Convert absolute path to relative if it's within project root
            if (path.startsWith(root)) {
              path = path.substring(root.length);
            }
          }
          
          // Build the new worker constructor with virtual module URL
          const worker_constructor = `${c1_new}${className}${c3_new_url}${urlQuote}${prefix}${path}${urlQuote}${c5_import_meta},${options}${c8_end}`;

          // SharedWorkers need .port property to access MessagePort
          const extra_shared = c2_type == "ComlinkWorker" ? "" : ".port";

          // Generate the final code that wraps the worker with Comlink
          const insertCode = `___wrap((${worker_constructor})${extra_shared});\n`;

          // Replace the original constructor call with our transformed version
          s.overwrite(index, index + matchCode.length, insertCode);
        }

        // Add import for Comlink wrap function at the top of the file
        s.appendLeft(
          0,
          `import {wrap as ___wrap} from 'vite-plugin-comlink/symbol';\n`
        );

        // Generate source map for our transformations with high resolution
        const magicStringMap = s.generateMap({
          source: id,
          includeContent: true,
          hires: true  // High-resolution source maps for better debugging
        });

        // Get the existing source map from previous transforms in the pipeline
        const existingMap = this.getCombinedSourcemap();
        
        let finalMap = magicStringMap;

        // Combine source maps if there are previous transformations
        // This ensures debugging works correctly through the entire transformation chain
        if (existingMap && existingMap.mappings && existingMap.mappings !== '') {
          try {
            // Create consumers for both source maps
            const existingConsumer = await new SourceMapConsumer(existingMap);
            const newConsumer = await new SourceMapConsumer(magicStringMap);

            // Create a new generator and apply the transformations
            const generator = SourceMapGenerator.fromSourceMap(newConsumer);
            generator.applySourceMap(existingConsumer, id);

            finalMap = generator.toJSON() as any;

            // Clean up consumers to prevent memory leaks
            existingConsumer.destroy();
            newConsumer.destroy();
          } catch (error) {
            // If source map combination fails, fall back to our generated map
            // This ensures the build doesn't fail due to source map issues
            console.warn('Failed to combine source maps:', error);
            finalMap = magicStringMap;
          }
        }

        return {
          code: s.toString(),
          map: finalMap,
        };
      },
    } as Plugin,
  ];
}

// Export as default for convenience
export default comlink;
