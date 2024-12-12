import type {OptionValues} from 'commander';
import * as fs from "fs";
import * as path from "path";
import primeflex2To3RegexDict from "../data/primeflex2To3RegexDict";
import translation from "../data/translationDict.json";

function preprocessHtml(htmlContent: string): string {
	return htmlContent;
}

function directTranslateToTailwind(
	htmlContent: string,
	translationDict: Record<string, string>
): string {
	const stringPattern = /(["'`])((?:\\\1|(?:(?!\1)).)*)(\1)/g;

	const output = htmlContent.replace(
		stringPattern,
		(
			match: string,
			quoteStart: string,
			content: string,
			quoteEnd: string
		) => {
			const parts = content.split(" ");
			const translatedParts = parts.map((part) => {
				return translationDict[part] || part;
			});

			return `${quoteStart}${translatedParts.join(" ")}${quoteEnd}`;
		}
	);

	return output;
}

function translatePrimeFlex2ToPrimeFlex3(vueContent: string): string {
	let output = vueContent;

	Object.keys(primeflex2To3RegexDict).forEach((key) => {
		const regex = new RegExp(key, "g");
		output = output.replace(regex, primeflex2To3RegexDict[key as keyof typeof primeflex2To3RegexDict]);
	});

	return output;
}

function processFolder(
	folderPath: string,
	translationDict: Record<string, string>,
	options: OptionValues,
	fromPrimeFlex2: boolean
) {
	if (folderPath.includes("node_modules")) {
		return;
	}

	fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
		if (err) throw err;
		entries.forEach((entry) => {
			console.log(entry.name);
			if (entry.isDirectory()) {
				processFolder(
					path.join(folderPath, entry.name),
					translationDict,
					options,
					fromPrimeFlex2
				);
			} else if (
				entry.name.endsWith(".vue") ||
				entry.name.endsWith(".js") ||
				entry.name.endsWith(".tsx") ||
				entry.name.endsWith(".jsx") ||
				entry.name.endsWith(".ts") ||
				entry.name.endsWith(".html") ||
				(options.styles &&
                    (entry.name.endsWith('.css') || entry.name.endsWith('.scss') || entry.name.endsWith('.sass')))
			) {
				const filePath = path.join(folderPath, entry.name);
				fs.readFile(filePath, "utf8", (err, data) => {
					if (err) throw err;

					let vueContent = preprocessHtml(data);

					if (fromPrimeFlex2) {
						vueContent = translatePrimeFlex2ToPrimeFlex3(vueContent);
					}

					vueContent = directTranslateToTailwind(
						vueContent,
						translationDict
					);

					fs.writeFile(filePath, vueContent, "utf8", (err) => {
						if (err) throw err;
						console.log(`${filePath} has been processed.`);
					});
				});
			}
		});
	});
}

function loadTranslationDict(vueFolderPath: string, options: OptionValues, fromPrimeFlex2: boolean) {
	processFolder(vueFolderPath, translation, options, fromPrimeFlex2);
}

export function startTranslation(vueFolderPath: string, options: OptionValues, fromPrimeFlex2: boolean) {
	try {
		loadTranslationDict(vueFolderPath, options, fromPrimeFlex2);
		console.log("✅ Translation completed.");
	} catch (err) {
		console.error(err);
	}
}
