"use strict";

const puppeteer = require("puppeteer");

const resources = new Map(
                    ["301667", "592"], // seatID , seatNum
                    ["301549", "474"],
                    ["301662", "587"],
                    ["301668", "593"],
                    ["301697", "622"],
);


function createDateObj (days) {
        const date = new Date();
        const newDate = date.setDate(date.getDate() + days);
        return newDate;
}


function createNewReservation (seatID, seatNum, date, isMorning) {
    const obj = {};
    const dateStr = (dt) => [dt.getFullYear(), dt.getMonth(), dt.getDate()].join("-");
    const startDate = dateStr(date);
    const endDate = function (isMorning, date) {    
        const dPlus1 = date.SetDate(date.getDate() + 1);
        return isMorning ? startDate : dateStr(dPlus1); 
    };
    const startTime = (isMorning) => isMorning ? "12" : "17"; 
    const endTime = (isMorning) => isMorning ? "17" : "00";
    obj.seatNum = seatNum;
    obj.Url = `https://www-sso.groupware.kuleuven.be/sites/KURT/Pages/NEW-Reservation.aspx?StartDateTime=${startDate}T${startTime}:00:00&EndDateTime=${endDate}T${endTime}:00:00&ID=${seatID}`;
    return obj;
}


// Login 
async function login (page, usr, pass) {
    await page.goto("https://www-sso.groupware.kuleuven.be/sites/KURT/Pages/default.aspx");
    const user = "input[name='username']";
    const password = "input[name='password']";
    const loginBtn = "#pwdLoginBtn";
    await page.waitForSelector(user);
    await page.evaluate((user, usr) => { 
	    document.querySelector(user);
	    inputUsr.value = usr;
    }, user, usr);
    await page.waitForSelector(password);
    await page.evaluate((password, pass) => { 
	const inputPass = document.querySelector(password);
	inputPass.value = pass;
    }, password, pass);    
    // click on login
    await page.click(loginBtn);
    await page.waitForNavigation({waitUntil: "networkidle0"});
}

async function makeReservation (page, isMorning) { 
    for (const [id, num] of resources) {
        const instance = createNewReservation(id, num, date, isMorning);
        await page.goto(instance.url);        
        await page.waitForNavigation({waitUntil: "networkidle0"});
        // fill submission form
        await fillForm(page);
        await submitForm(page, instance.seatNum);
    }
}
    
async function fillForm(page) {
    const subject = "#kurtResourceSubject";
    const checkbox = "#complyConditionsCheckbox";
    await page.waitForSelector(subject, {timeout: 60000});
    await page.waitForSelector(checkbox, {timeout: 60000});
    // await page.$eval(subject, el => el.value = "Study");
    await page.$eval(checkbox, el => el.checked = true);
}

async function submitForm (page, seatNum) {
    const submitBtn = "#submitReservationButton";
    const confirmationMsg = "#";
    await page.waitForSelector(submitBtn, {timeout: 60000});
    await page.click(submitBtn);
    // if confimation ==> break, else => continue 
    const result = page
                       .waitForSelector(confirmationMsg, {visible: true, timeout: 60000})
                       .then(value => { console.log("Successfully booked seat:", seatNum); return break; 
                        }, reason => { return continue; });
}

// deal with unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
    throw new Error("Script failed!");
});

// Async function 
async function main() {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const screen = (page, name) =>  page.screenshot({ path: `${name}.png` });
    const user = process.argv[2];
    const password = process.argv[3];
    const dayPlus = Number(process.argv[4]);
    // const isMorning = (process.argv[5] === "true");
    const date = createDateObject(dayPlus);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // Change default timeout for navigation methods (goto, waitForNavigation etc.)
    await page.setDefaultNavigationTimeout(60000);
    // Change default timeout 
    await page.setDefaultTimeout(45000);
    // Set viewport width and height
    await page.setViewport({ width: 1280, height: 1800 });
    // Await login
    await login(page, usr, pass);
    await makeReservation(page, false);
    await makeReservation(page, true);
    await browser.close();
}


