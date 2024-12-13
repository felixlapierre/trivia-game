// Business Logic

function login() {
    var username = document.getElementById("input-username").value;
    var password = document.getElementById("input-password").value
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
    document.getElementById("root").innerHTML = `
    <div class="level is-mobile" id="header" style="background-color:${getTeamColor(data.team)}">
        <div class="level-left">
            <div class="level-item">
                &nbsp${data.name} - Team ${data.team}
            </div>
        </div>
        <div class="level-right">
            <div class="level-item">
                ${data.score} points&nbsp
            </div>
        </div>
    </div>

  <div class="container is-fluid">
    <div>
      <div class="control">
        <input id="submit-box" class="input submit-box is-large mt-5" type="text" placeholder="Enter your answer">
      </div>
      <div>
        <input type="submit" class="button is-primary submit-button" onclick="submit()" enterkeyhint="done"></button>
      </div>
    </div>
    <div id="questions-list" class="mt-5">
    </div>
    <div>
        <button class="button is-danger mt-5" onclick="logout()">Log Out</button>
    </div>
  </div>
    `

    render_section("General Knowledge", 1, 20)
    render_section("Science", 21, 40)
    render_section("Movies & TV", 41, 60)
    render_section("History & Geography", 61, 80)
    render_section("Silly Questions", 81, 100)
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
                    alert(`The question was already answered for your team by ${body.already_answered_by}, but your answer was ${body.result}`)
                } else if (body.result == "correct") {
                    alert(`Your answer was correct! +${body.score}pts` + (body.first ? " (You were first to answer!)" : ""))
                    render()
                } else {
                    alert(`Your answer was incorrect :(`)
                }
            })
        })
    })
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
            return "darkred"
        case("blue"):
            return "deepskyblue"
    }
}