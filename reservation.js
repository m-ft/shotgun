"use strict";

const puppeteer = require("puppeteer");

const resources = new Map([
    ["301667", "592"], // seatID , seatNum
    ["301549", "474"],
    ["301662", "587"],
    ["301668", "593"],
    ["301697", "622"],
]);

Date.prototype.addDays = function(days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

Date.prototype.getDateString = function () {
    let date = new Date(this.valueOf());
    return [date.getFullYear(), date.getMonth() + 1 , date.getDate()].join("-").toString();
}

function createNewReservation (seatID, seatNum, days, isMorning) {
    const date = new Date();
    const obj = {};
    const startDate = date.addDays(days).getDateString();
    const endDate = isMorning ? startDate : date.addDays(days + 1).getDateString();
    const startTime = isMorning ? "12" : "17"; 
    const endTime = isMorning ? "17" : "00";
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
        const inputUsr = document.querySelector(user);
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

async function makeReservation (page, resources, days, isMorning, screen) { 
    reservation_loop: 
    for (const [id, num] of resources) {
        const instance = createNewReservation(id, num, days, isMorning);
        console.log(instance.Url);
        await page.waitForNavigation({waitUntil: "networkidle0"});
        await page.goto(instance.Url);        
        await page.waitForNavigation();
        // fill submission form
        const result = await submitForm(page, instance.seatNum);
        if (result === 1) {
            break reservation_loop; 
        }
        if (result === 0)
        {
            continue reservation_loop;
        }
    }
}


async function submitForm (page, seatNum) {
    const checkbox = "#complyConditionsCheckbox";
    await page.waitForSelector(checkbox, {timeout: 60000});
    await page.$eval(checkbox, el => el.checked = true);
    const submitBtn = "#submitReservationButton";
    const confirmationMsg = "#form-confirmation-message";
    // const error = "#errorLabel .alert";
    await page.waitForSelector(submitBtn, {timeout: 60000});
    await page.click(submitBtn);
    // if confimation ==> break, else => continue 
    return page.
        waitForSelector(confirmationMsg, {visible: true, timeout: 60000})
        .then(value => { console.log("Successfully booked seat:", seatNum, value); return 1;
        },reason => { console.log("Booking failed", reason); return 0; });
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
    const usr = process.argv[2];
    const pass = process.argv[3];
    const dayPlus = Number(process.argv[4]);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // Change default timeout for navigation methods (goto, waitForNavigation etc.)
    page.setDefaultNavigationTimeout(60000);
    // Change default timeout 
    page.setDefaultTimeout(45000);
    // Set viewport width and height
    await page.setViewport({ width: 1280, height: 1800 });
    // Await login
    await login(page, usr, pass);
    await screen(page, "login");
    const evening = makeReservation(page, resources, dayPlus, false, screen);
    await screen(page, "evening");
    const morning = makeReservation(page, resources, dayPlus, true, screen);
    const all = Promise.allSettled([evening, morning]);
    all.then(() => console.log("Script executed with success!"));
    await browser.close();
}

main();