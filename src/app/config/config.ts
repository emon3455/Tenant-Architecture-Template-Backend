import { production } from "../constant/constant";

const chromePath = production ? "/usr/bin/chromium-browser" : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export { chromePath };
