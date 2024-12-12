#!/usr/bin/env node

import { widgets } from "./routes/widgets";
import { Command, type OptionValues } from "commander";
import Spinner from "./utils/misc/spinner";
import { translateToTailwind } from "./utils/helpers/primeflex";
import { uninstall } from "./utils/helpers/clt";

const program = new Command();
const spinner = new Spinner();

program.description("Our New CLI");
program.option("-v, --verbose", "verbose logging");
program.version("0.1.5", "--version", "output the current version");

program.addCommand(widgets);

program
	.command("pf2tw")
	.aliases(["pf32tw"])
	.description("Translate PrimeFlex 3.x classes to Tailwind CSS classes")
	.option("-s, --styles", "Include stylesheets (CSS, SCSS, etc.)")
	.option("-p, --prefix <prefix>", "Prefix for the Tailwind CSS classes")
	.action(async (options: OptionValues) => {
		await translateToTailwind(options);
	});

program
	.command("pf22tw")
	.description("Translate PrimeFlex 2.x classes to Tailwind CSS classes")
	.option("-s, --styles", "Include stylesheets (CSS, SCSS, etc.)")
	.option("-p, --prefix <prefix>", "Prefix for the Tailwind CSS classes")
	.action(async (options: OptionValues) => {
		await translateToTailwind(options, true);
	});

program
	.command("uninstall")
	.description("Uninstall PrimeCLT")
	.action(async () => {
		await uninstall();
	});

async function main() {
	await program.parseAsync();
}

main();

process.on("unhandledRejection", function (err: Error) {
	const debug = program.opts().verbose;
	if (debug) {
		console.error(err.stack);
	}
	spinner.spinnerError();
	spinner.stopSpinner();
	program.error("", { exitCode: 1 });
});
