import { chromium } from "playwright";

async function main() {
  const inputData = process.argv[2];
  if (!inputData) {
    console.error(JSON.stringify({ error: "Missing JSON payload argument" }));
    process.exit(1);
  }

  let options;
  try {
    options = JSON.parse(inputData);
  } catch (err) {
    console.error(JSON.stringify({ error: `Invalid JSON payload: ${err.message}` }));
    process.exit(1);
  }

  const {
    action = "navigate",
    url,
    selector,
    text,
    script,
    fullPage = false,
    headless = true,
    timeout = 30000,
    viewport = { width: 1280, height: 800 }
  } = options;

  let browser;
  try {
    browser = await chromium.launch({
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    const context = await browser.newContext({
      viewport,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });

    const page = await context.newPage();
    page.setDefaultTimeout(timeout);

    if (url) {
      const targetUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout });
    }

    if (action === "navigate") {
      const title = await page.title();
      const currentUrl = page.url();
      const pageText = await page.evaluate(() => {
        const removeTags = ["script", "style", "noscript", "svg"];
        removeTags.forEach((tag) => {
          document.querySelectorAll(tag).forEach((el) => el.remove());
        });
        const bodyText = document.body ? document.body.innerText : "";
        return bodyText.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 100).join("\n");
      });

      console.log(JSON.stringify({
        status: "success",
        title,
        url: currentUrl,
        content: pageText
      }));
    } else if (action === "screenshot") {
      const title = await page.title();
      const currentUrl = page.url();
      const buffer = await page.screenshot({ fullPage, type: "png" });
      const base64 = buffer.toString("base64");
      const dataUri = `data:image/png;base64,${base64}`;

      console.log(JSON.stringify({
        status: "success",
        title,
        url: currentUrl,
        image_data_uri: dataUri,
        byte_length: buffer.length
      }));
    } else if (action === "click") {
      if (!selector) {
        throw new Error("Selector is required for click action");
      }
      await page.click(selector, { timeout });
      await page.waitForTimeout(1000);
      const title = await page.title();
      const currentUrl = page.url();

      console.log(JSON.stringify({
        status: "success",
        title,
        url: currentUrl,
        clicked_selector: selector
      }));
    } else if (action === "fill") {
      if (!selector) {
        throw new Error("Selector is required for fill action");
      }
      await page.fill(selector, text || "", { timeout });
      console.log(JSON.stringify({
        status: "success",
        filled_selector: selector,
        value: text || ""
      }));
    } else if (action === "evaluate") {
      if (!script) {
        throw new Error("Script is required for evaluate action");
      }
      const evalResult = await page.evaluate((s) => {
        return eval(s);
      }, script);

      console.log(JSON.stringify({
        status: "success",
        result: evalResult
      }));
    } else {
      throw new Error(`Unsupported browser action: ${action}`);
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

main();
