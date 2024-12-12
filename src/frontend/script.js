function login(username, password) {
    const request = new Request('/api/login')
    request.method = 'POST'
    request.body = {
        username,
        password
    }
    fetch(request).then((response) => {
        const token = response.json
        document.cookie = `token=${token}`
    })
}