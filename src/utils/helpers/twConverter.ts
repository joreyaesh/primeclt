import type {OptionValues} from 'commander';
import * as fs from "fs";
import * as path from "path";
import primeflex2To3RegexDict from "../data/primeflex2To3RegexDict";
import primeFlexClassSet from "../data/primeFlexClassSet";
import translation from "../data/translationDict.json";

function preprocessHtml(htmlContent: string): string {
	return htmlContent;
}

function directTranslateToTailwind(
	htmlContent: string,
	translationDict: Record<string, string>,
	prefix = ''
): string {
	const stringPattern = /(?<!\*ng[A-Z]\w+\]?=)(["'`])((?:\\\1|(?:(?!\1)).)*)(\1)/g;

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
				let translated = part;

				if (part in translationDict) {
					// Split dictionary value into individual classes
					const translatedClasses = translationDict[part].split(" ").map(className => {
						if (prefix) {
							// Handle responsive prefixes and negative values
							const segments = className.split(':');

							if (segments.length === 2) {
								// Has responsive prefix
								const [screen, name] = segments;
								if (name.startsWith('-')) {
									// Negative value
									return `${screen}:-${prefix}${name.substring(1)}`;
								}
								return `${screen}:${prefix}${name}`;
							} else {
								// No responsive prefix
								if (className.startsWith('-')) {
									// Negative value
									return `-${prefix}${className.substring(1)}`;
								}
								return `${prefix}${className}`;
							}
						}
						return className;
					});
					return translatedClasses.join(" ");
				}

				if (prefix && primeFlexClassSet.has(part)) {
					// Handle responsive prefixes and negative values
					const segments = translated.split(':');

					if (segments.length === 2) {
						// Has responsive prefix
						const [screen, className] = segments;
						if (className.startsWith('-')) {
							// Negative value
							return `${screen}:-${prefix}${className.substring(1)}`;
						}
						return `${screen}:${prefix}${className}`;
					} else {
						// No responsive prefix
						if (translated.startsWith('-')) {
							// Negative value
							return `-${prefix}${translated.substring(1)}`;
						}
						return `${prefix}${translated}`;
					}
				}

				return translated;
			});

			return `${quoteStart}${translatedParts.join(" ")}${quoteEnd}`;
		}
	);

	return output;
}

function translatePrimeFlex2ToPrimeFlex3(vueContent: string, prefix = ''): string {
	let output = vueContent;

	Object.keys(primeflex2To3RegexDict).forEach((part) => {
		const regex = new RegExp(part, "g");
		if (part in primeflex2To3RegexDict) {
			output = output.replace(regex, `${prefix}${primeflex2To3RegexDict[part as keyof typeof primeflex2To3RegexDict]}`);
		}
	});

	return output;
}

function processFolder(
	folderPath: string,
	translationDict: Record<string, string>,
	options: OptionValues,
	fromPrimeFlex2: boolean
) {
	if (folderPath.includes("node_modules") || folderPath.includes(".git") || folderPath.includes(".angular")) {
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
						vueContent = translatePrimeFlex2ToPrimeFlex3(vueContent, options.prefix);
					}

					vueContent = directTranslateToTailwind(
						vueContent,
						translationDict,
						options.prefix
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
