// State
var lockout_seconds
var score = 0

// Business Logic

function login() {
    var username = document.getElementById("input-username").value;
    var password = document.getElementById("input-password").value;
    username = username.toLowerCase()
    password = password.toLowerCase()
    console.log("Login as " + username)
    const headers = new Headers()
    headers.append("content-type", "application/json")
    var body = {
        username,
        password
    }
    const request = new Request('/api/login', {
        "method": "POST",
        "body": JSON.stringify(body),
        "headers": headers
    })
    fetch(request).then((response) => {
        if (response.status == 200) {
            response.json().then((token) => {
                document.cookie = `token=${token}`
                render()
            })
        } else {
            alert("Wrong username/password dipshit");
        }
    })
}

function logout() {
    document.cookie = `token=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    render()
}

function submit() {
    var answer = document.getElementById("submit-box").value
    answer = answer.toLowerCase()
    answer = answer.replace(/\s/g, '-')
    // Validate the answer
    console.log(answer)
    if (!/\d+(-\w+)+/.test(answer)) {
        alert("Answer is not in a valid format")
    } else {
        submit_answer(answer)
    }
}

// Rendering Functions

function render() {
    if (!document.cookie.includes("token")){
        renderLogin()
    } else {
        home().then((data) => {
            renderMainPage(data)
        })
        .catch(() => {
            logout()
        })
    }
}

function renderLogin() {
    document.getElementById("root").innerHTML = `
    <div class="container is-fluid">
        <div class="control">
            <input id="input-username" class="input submit-box is-large" type="text" placeholder="Username">
            <input id="input-password" class="input submit-box is-large" type="password" placeholder="Password">
            <button class="button is-primary submit-button" onclick="login()">Login</button>
        </div>
    </div>
    `
}

function renderMainPage(data) {
    score = data.score
    document.getElementById("root").innerHTML = `
    <div class="level is-mobile" id="header" style="background-color:${getTeamColor(data.team)}">
        <div class="level-left">
            <div class="level-item">
                &nbsp${data.name} - Team ${data.team}
            </div>
        </div>
        <div class="level-right">
            <div class="level-item" id="score">
                ${score} points&nbsp
            </div>
        </div>
    </div>

  <div class="container is-fluid mt-4">
    <div class="submit-container">
      <div class="control">
        <input id="submit-box" class="input submit-box is-large mt-5" type="text" placeholder="Enter your answer">
      </div>
      <div>
        <input id="submit-button" type="submit" class="button is-primary submit-button" onclick="submit()" enterkeyhint="done"></button>
      </div>
      <div id="notification" class="notification is-light" hidden>
        <button class="delete" onclick="closeNotification()"></button>
        <p id="notification-text"></p>
      </div>
    </div>
    <div id="questions-list" class="mt-5">
    </div>
    <div id="leaderboard">
    </div>
    <div>
        <button class="button is-danger mt-5" onclick="logout()">Log Out</button>
    </div>
  </div>
    `

    render_section("General Knowledge", 1, 10)
    render_section("Life Sciences", 11, 30)
    render_section("Unalive Sciences", 31, 50)
    render_section("Movies", 51, 70)
    render_section("TV Shows", 71, 90)
    render_section("History & Geography", 91, 120)
    render_section("Games", 121, 130)
    render_section("Felix's Fun Category", 131, 140)
    render_section("Music", 141, 160)
    render_section("Book Club", 161, 180)
    render_section("Miscellaneous", 181, 200)

    if(data.name == "Felix") {
        render_leaderboard()
    }
}

function render_section(category, min, max) {
    document.getElementById("questions-list").innerHTML += `
    <div class="card mt-1" id="ql-${min}-${max}">
        <header class="card-header" onclick="open_section('${category}', ${min}, ${max})">
            <p class="card-header-title">${category} (${min}-${max})</p>
            <button class="card-header-icon" aria-label="more options">
                <div class="icon-text"
                    <span class="icon has-text-info">
                        <i class="fas fa-angle-down"></i>
                    </span>
                </div>
            </button>
        </header>
        <div class="card-content" id="content-${min}-${max}" hidden>
        </div>
    </div>
`}

function open_section(category, min, max) {
    var section = document.getElementById(`content-${min}-${max}`)
    var section_hidden = section.hidden
    for (let element of document.getElementsByClassName("card-content")) {
        element.hidden = true
    };
    if(section_hidden == true) {
        section.hidden = false
        get_answers(min, max).then((data) => {
            section.innerHTML = `
            <table class="table is-bordered">
                <thead>
                    <tr>
                        <th>Q#</th>
                        <th>Status</th>
                        <th>Solved By</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${getTableRows(min, max, data)}
                </tbody>
            </table>
        `
        })

    } else {
        section.hidden = true
    }
}

function getTableRows(min, max, data) {
    var result = ""
    for(let i = min; i <= max; i++) {
        var row_data = data[i]
        var solved = row_data != undefined
        var row = `
            <tr>
                <th>${i}</th>
                <td><span class="tag ${solved ? "is-success" : "is-dark"}">${solved ? "Solved" : "Unsolved"}</span></td>
                <td >${solved ? row_data.user : ""}</td>
                <td>${solved ? row_data.score : ""}</td>
            </tr>
        `
        result += row
    }
    return result
}

function render_leaderboard() {
    get_leaderboard().then((result) => {
        console.log(result)
        var leaderboard_element = document.getElementById("leaderboard")
        leaderboard_element.innerHTML = `
            <h1 class="title mt-6" style="text-align:center">Leaderboard</h1>
            <table class="table is-bordered" style="margin:auto">
                ${result[0].teamScores.map((team) => {
                    return `<tr><th style="background-color:${getTeamColor(team.team)};color:white">Team ${team.team}</th><td>${team.totalScore}</td><td>${team.totalQuestions} questions</td></tr>`
                })}
            </table>
            <h2 class="subtitle mt-6" style="text-align:center">Top Players</h2>
            <table class="table is-bordered" style="margin:auto">
                <thead><tr><th>Name</th><th>Team</th><th>Score</th><th>Answered</th></tr></thead>
                ${result[0].userScores.map((user) => {
                    return `<tr style="background-color:${getTeamColor(user.team)};color:white"><td>${user.user}</td><td>${user.team}</td><td>${user.totalScore}</td><td>${user.totalQuestions} questions</td></tr>`
                })}
            </table>
        `
    })

}

render()

// APIs

fetch("/api/hello").then((response) => {
    response.json().then((body) => {
        console.log(body.message)
    })
})

function home() {
    return new Promise((resolve, reject) => {
        const headers = new Headers()
        headers.append("authorization", "Bearer " + getToken())
        const request = new Request("api/home", {
            "method": "GET",
            "headers": headers
        })
        fetch(request).then((response) => {
            if (response.status == 403) {
                reject()
            }
            response.json().then((body) => {
                resolve(body)
            })
        })
    })
}

function submit_answer(answer) {
    return new Promise((resolve, reject) => {
        const headers = new Headers()
        headers.append("authorization", "Bearer " + getToken())
        headers.append("content-type", "application/json")
        const request = new Request("api/submit", {
            "method": "POST",
            "headers": headers,
            "body": JSON.stringify({
                answer
            })
        })
        fetch(request).then((response) => {
            response.json().then((body) => {
                if (body.already_answered_by != null) {
                    setNotification("is-warning", `The question was already answered for your team by ${body.already_answered_by}, but your answer was ${body.result}`)
                } else if (body.result == "correct") {
                    setNotification("is-success", `Your answer was correct! +${body.score}pts` + (body.first ? "\nYou were the first team to answer!" : ""))
                    score += body.score
                    document.getElementById("score").innerHTML = `${score} points&nbsp`
                } else {
                    var submitButton = document.getElementById("submit-button")
                    submitButton.disabled = true
                    lockout_seconds = 15
                    submitButton.value = `Submit (Locked for ${lockout_seconds}s)`

                    var interval = setInterval(() => {
                        lockout_seconds -= 1
                        submitButton.value = `Submit (Locked for ${lockout_seconds}s)`
                    }, 1000)
                    setTimeout(() => {
                        submitButton.disabled = false
                        submitButton.value = `Submit`
                        clearInterval(interval)
                    }, 15000)
                    setNotification("is-danger", `Your answer was incorrect :(\nYou'll have to wait 15 seconds before you can submit again`)
                }
            })
        })
    })
}

function get_leaderboard() {
    return new Promise((resolve, reject) => {
        const headers = new Headers()
        headers.append("authorization", "Bearer " + getToken())
        const request = new Request("api/leaderboard", {
            "method": "GET",
            "headers": headers
        })
        fetch(request).then((response) => {
            response.json().then((body) => {
                resolve(body)
            })
        })
    })
}

function setNotification(level, text) {
    var notification = document.getElementById("notification")
    notification.className = `notification is-light ${level}`
    document.getElementById("notification-text").innerText = text
    notification.hidden = false
}

function closeNotification() {
    var notification = document.getElementById("notification")
    notification.hidden = true
}

function get_answers(min, max) {
    return new Promise((resolve, reject) => {
        const headers = new Headers()
        headers.append("authorization", "Bearer " + getToken())
        headers.append("content-type", "application/json")
        const request = new Request("api/answers", {
            "method": "POST",
            "headers": headers,
            "body": JSON.stringify({
                min,
                max
            })
        })
        fetch(request).then((response) => {
            response.json().then((body) => {
                var map = {}
                body.map((el) => {
                    map[el.question] = el
                })
                resolve(map)
            })
        })
    })
}

// Utilities

function getToken() {
    return document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];
}

function getTeamColor(team) {
    switch(team) {
        case("red"):
            return "firebrick"
        case("blue"):
            return "dodgerblue"
    }
}