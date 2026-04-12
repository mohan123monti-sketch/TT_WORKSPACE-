const fs = require('fs');
let html = fs.readFileSync('public/submissions.html', 'utf8');

let styleIndex = 1;
let generatedStyles = [];

// Match exactly style="..."
html = html.replace(/style="([^"]+)"/g, (match, styleVal) => {
    // Generate a new class
    let className = 'ext-sub-style-' + styleIndex++;

    // Push the style content to the array
    generatedStyles.push('.' + className + ' { ' + styleVal + ' }');

    // Instead of replacing the element itself, we inject a space + class property
    // But wait, the standard way in regex is just returning the `class="..."` and letting the HTML consumer deal with two class attributes? No, that's invalid HTML.

    // Actually, I can just return `class="ext-sub..."` and rely on a DOM parser.
    return match; // NOOP right now
});

// Using a basic string search approach to avoid complex regex
let outputHtml = '';
let pointer = 0;
while (true) {
    let styleStart = html.indexOf('style="', pointer);
    if (styleStart === -1) {
        outputHtml += html.substring(pointer);
        break;
    }

    let styleEnd = html.indexOf('"', styleStart + 7);
    let styleVal = html.substring(styleStart + 7, styleEnd);

    let className = 'ext-sub-' + styleIndex++;
    generatedStyles.push('.' + className + ' { ' + styleVal + ' }');

    // look behind for class="..."
    let tagStart = html.lastIndexOf('<', styleStart);
    let classStart = html.indexOf('class="', tagStart);

    if (classStart !== -1 && classStart < styleStart) {
        // Class attribute exists before style attribute!
        outputHtml += html.substring(pointer, styleStart); // everything up to style="

        // Inject into the class attribute
        let classContentStart = classStart + 7;
        outputHtml = outputHtml.substring(0, outputHtml.length - (styleStart - classContentStart));
        outputHtml += className + ' ' + html.substring(classContentStart, styleStart);
        pointer = styleEnd + 1;
    } else {
        // No class attribute found before it. Look after it within the same tag.
        let tagEnd = html.indexOf('>', styleStart);
        let classAfter = html.indexOf('class="', styleStart);

        if (classAfter !== -1 && classAfter < tagEnd) {
            let classContentStart = classAfter + 7;
            outputHtml += html.substring(pointer, styleStart);
            outputHtml = outputHtml.substring(0, outputHtml.length - (styleStart - classContentStart)) + className + ' ' + html.substring(classContentStart, styleStart);
            pointer = styleEnd + 1; // BROKEN logic for injecting after.
        } else {
            // Replace style=".." with class="..."
            outputHtml += html.substring(pointer, styleStart) + 'class="' + className + '"';
            pointer = styleEnd + 1;
        }
    }
}

// Actually, cheerio makes this 100x easier. Let's use Cheerio since node modules are usually available in tech-turf.
