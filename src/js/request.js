function request(method, url, data = {}, callback) {
	const xhr = new XMLHttpRequest();
	xhr.open(method, url);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify(data));
	xhr.onreadystatechange = () => {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				callback(xhr.response);
			} else if (xhr.status(500)) {
				alert("서버에서 오류가 발생했습니다.");
			}
		}
	};
}
