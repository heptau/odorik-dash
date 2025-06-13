// Globální proměnné
let allCachedCalls = [];
let displayedCalls = [];
let currentApiUser = null;
const ROWS_PER_PAGE = 100;

// Mapa mezinárodních předvoleb na vlajky a názvy států
const countryFlags = {
	'+420': { flag: '🇨🇿', name: 'Česká republika' },
	'+421': { flag: '🇸🇰', name: 'Slovensko' },
	'+1': { flag: '🇺🇸', name: 'USA' },
	'+44': { flag: '🇬🇧', name: 'Velká Británie' },
	'+49': { flag: '🇩🇪', name: 'Německo' },
	// Přidat další předvolby podle potřeby
};

// Pomocná funkce pro formátování telefonního čísla
function formatPhoneNumber(number) {
	if (!number) return { formatted: '', flag: '', country: '' };
	let cleaned = number.replace(/^00/, '+');
	let prefix = '';
	let flag = '';
	let country = '';
	for (let code in countryFlags) {
		if (cleaned.startsWith(code)) {
			prefix = code;
			flag = countryFlags[code].flag;
			country = countryFlags[code].name;
			break;
		}
	}
	if (prefix) {
		let rest = cleaned.slice(prefix.length);
		return { formatted: `${prefix} ${rest}`, flag, country };
	}
	return { formatted: cleaned, flag: '', country: 'Neznámé' };
}

// Pomocná funkce pro formátování délky hovoru
function formatDuration(seconds) {
	if (!seconds) return '0 s';
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (minutes > 0) {
		return `${minutes} m ${remainingSeconds} s`;
	}
	return `${seconds} s`;
}

// Pomocná funkce pro formátování ceny
function formatPrice(price) {
	const fixedPrice = parseFloat(price || 0).toFixed(4);
	const [integer, decimal] = fixedPrice.split('.');
	const decimalMain = decimal.slice(0, 2);
	const decimalLast = decimal.slice(2);
	return `${integer},${decimalMain}<span class="price-decimal-second">${decimalLast}</span>`;
}

// Pomocná funkce pro AJAX požadavky
function makeApiRequest(url, callback) {
	console.log(`API Request: ${url}`);
	const xhr = new XMLHttpRequest();
	xhr.open('GET', url);
	xhr.onload = function() {
		if (xhr.status >= 200 && xhr.status < 300) {
			try {
				const data = JSON.parse(xhr.responseText);
				callback(null, data);
			} catch (e) {
				console.error("Chyba při parsování JSON odpovědi:", e);
				callback(new Error('Chyba při parsování JSON odpovědi.'));
			}
		} else {
			console.error(`Chyba HTTP ${xhr.status}: ${xhr.statusText}`);
			callback(new Error('Chyba při načítání dat: ' + xhr.statusText));
		}
	};
	xhr.onerror = function() {
		console.error("Chyba sítě nebo serveru při API požadavku.");
		callback(new Error('Chyba sítě nebo serveru.'));
	};
	xhr.send();
}

// Funkce pro načtení dat z localStorage
function loadCallsFromCache(userId) {
	console.log(`Pokus o načtení dat z cache pro uživatele: ${userId}`);
	try {
		const cachedData = localStorage.getItem(`odorik_calls_${userId}`);
		const calls = cachedData ? JSON.parse(cachedData) : [];
		if (calls.length > 0) {
			const firstCallDate = new Date(calls[0].date).toLocaleString();
			const lastCallDate = new Date(calls[calls.length - 1].date).toLocaleString();
			console.log(`Načteno ${calls.length} hovorů z cache pro uživatele ${userId} (od ${firstCallDate} do ${lastCallDate}).`);
		} else {
			console.log(`Cache pro uživatele ${userId} je prázdná.`);
		}
		return calls;
	} catch (e) {
		console.error("Chyba při načítání dat z localStorage:", e);
		return [];
	}
}

function saveCallsToCache(userId, calls) {
	try {
		const sortedCalls = [...calls].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
		localStorage.setItem(`odorik_calls_${userId}`, JSON.stringify(sortedCalls));
		console.log(`Uloženo ${sortedCalls.length} hovorů do cache pro uživatele: ${userId}.`);
	} catch (e) {
		console.error("Chyba při ukládání dat do localStorage:", e);
	}
}

// Funkce pro zobrazení hovorů v tabulce
function displayCalls(calls) {
	const callsTableBody = document.getElementById('callsTableBody');
	callsTableBody.innerHTML = '';

	if (calls && Array.isArray(calls)) {
		const sortedForDisplay = [...calls].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		sortedForDisplay.forEach(call => {
			const row = callsTableBody.insertRow();

			// Datum a čas
			const dateCell = row.insertCell();
			dateCell.className = 'date-cell';
			const dateObj = new Date(call.date); // call.date je "YYYY-MM-DDTHH:MM:SSZ", takže dateObj je UTC
			const options = { timeZone: 'Europe/Prague' }; // CET/CEST pro ČR
			dateCell.innerHTML = `<span>${dateObj.toLocaleDateString('cs-CZ', options)}</span><span>${dateObj.toLocaleTimeString('cs-CZ', { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>`;

			// Volající
			const sourceCell = row.insertCell();
			sourceCell.className = 'phone-cell';
			const source = formatPhoneNumber(call.source_number);
			sourceCell.innerHTML = `<span>${source.formatted}</span><span>${source.flag} ${source.country}</span>`;

			// Volaný
			const destCell = row.insertCell();
			destCell.className = 'phone-cell';
			const destNumberInfo = formatPhoneNumber(call.destination_number);
			// Zde ponecháme title s destination_name, protože se stále vztahuje k volanému číslu
			const tooltipTextDest = call.destination_name || 'Neznámý typ služby';
			// Ikona se přesouvá do lineCell, takže zde bude jen číslo a vlajka/země
			destCell.innerHTML = `<span title="${tooltipTextDest}">${destNumberInfo.formatted}</span><span>${destNumberInfo.flag} ${destNumberInfo.country}</span>`;

			// Linka a směr (SEM PŘIDÁME IKONU SLUŽBY)
			const lineCell = row.insertCell();
			lineCell.className = 'line-cell'; // Můžeme si přidat i vlastní třídu pro lepší styling

			// 1. Zjištění směru hovoru (In/Out/Redirected atd.)
			let directionText = '';
			if (call.direction && typeof call.direction === 'string') {
				directionText = call.direction.charAt(0).toUpperCase() + call.direction.slice(1);
			} else if (call.direction) {
				directionText = String(call.direction);
			}

			// 2. Zjištění ikony typu služby na základě call.destination_name
			let serviceIcon = ''; // Výchozí je žádná ikona, pokud typ nelze určit nebo není relevantní
								  // Pokud chceme vždy nějakou výchozí (❓), můžeme ji nastavit zde.
								  // Ale pro tento sloupec může být lepší nemít ikonu, pokud není jasná.

			if (call.destination_name) {
				const destNameLower = call.destination_name.toLowerCase();
				if (destNameLower.includes('sms')) {
					serviceIcon = '🗨️ ';
				} else if (destNameLower.includes('mobil')) {
					serviceIcon = '📞 ';
				} else if (destNameLower.includes('v síti') || destNameLower.includes('pevná')) {
					serviceIcon = '☎ ';
				}
				// Pokud bychom chtěli otazník pro neznámé, ale existující destination_name:
				// else {
				//     serviceIcon = '❓ ';
				// }
			}

			// Sestavení obsahu buňky:
			// První řádek: call.line
			// Druhý řádek: serviceIcon (pokud je) + directionText
			const lineValue = call.line || ''; // Hodnota linky, nebo prázdný string

			lineCell.innerHTML = `<span>${lineValue}</span><span>${serviceIcon}${directionText}</span>`;


			// Délka a cena
			const durationPriceCell = row.insertCell();
			// ... (kód pro délku a cenu zůstává)
			durationPriceCell.className = 'duration-price-cell';
			durationPriceCell.innerHTML = `<span>${formatDuration(call.length)}</span><span>${formatPrice(call.price)}</span>`;

		});
	}
}

// Funkce pro přidání dalších hovorů do tabulky
function appendNextCalls() {
	const nextCalls = allCachedCalls.slice(displayedCalls.length, displayedCalls.length + ROWS_PER_PAGE);

	if (nextCalls.length > 0) {
		displayedCalls = displayedCalls.concat(nextCalls);
		displayCalls(displayedCalls);
		console.log(`Přidáno ${nextCalls.length} hovorů. Celkem zobrazeno: ${displayedCalls.length}.`);
	}
}

// Funkce pro načtení a cachování hovorů z API
function fetchAndCacheCalls(apiUser, apiPass, fromDate, toDate, append, callback) {
	const loginMessage = document.getElementById('loginMessage');
	const startTime = new Date();

	// Funkce pro formátování data a času pro API (používá UTC metody)
	const formatDateTime = (date) => {
		const year = date.getUTCFullYear();
		const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Měsíce jsou od 0
		const day = String(date.getUTCDate()).padStart(2, '0');
		const hours = String(date.getUTCHours()).padStart(2, '0');
		const minutes = String(date.getUTCMinutes()).padStart(2, '0');
		const seconds = String(date.getUTCSeconds()).padStart(2, '0');
		// API Odorik očekává formát YYYY-MM-DDTHH:MM:SS a interpretuje ho jako UTC
		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
	};

	const dateFromFormatted = formatDateTime(fromDate);
	const dateToFormatted = formatDateTime(toDate);

	console.log(`Načítám data z API pro uživatele: ${apiUser} od ${dateFromFormatted} do ${dateToFormatted}.`);
	if (append) {
		console.log("Režim načítání: Připojit nová data k existujícím.");
	} else {
		console.log("Režim načítání: Nahradit existující data.");
	}

	const apiUrl = `https://www.odorik.cz/api/v1/calls.json?user=${encodeURIComponent(apiUser)}&password=${encodeURIComponent(apiPass)}&from=${encodeURIComponent(dateFromFormatted)}&to=${encodeURIComponent(dateToFormatted)}&include_sms=true`;

	loginMessage.textContent = 'Načítám data... ⏳';
	loginMessage.style.display = 'block';

	makeApiRequest(apiUrl, (error, data) => {
		const loadDuration = (new Date() - startTime) / 1000;
		console.log(`Načítání dat trvalo ${loadDuration.toFixed(2)} sekund.`);

		if (error) {
			loginMessage.textContent = 'Chyba: ' + error.message;
			if (callback) callback(error);
			return;
		}

		if (data && data.errors) {
			loginMessage.textContent = 'Chyba autentizace: Neplatné uživatelské jméno nebo heslo.';
			console.error("Chyba z Odorik API:", data.errors);
			if (callback) callback(new Error('Chyba autentizace: ' + data.errors.join(', ')));
			return;
		}

		const newCalls = data;

		if (newCalls && Array.isArray(newCalls)) {
			console.log(`API vrátilo ${newCalls.length} nových hovorů.`);
			if (append) {
				const existingCallIds = new Set(allCachedCalls.map(call => call.id));
				const uniqueNewCalls = newCalls.filter(call => !existingCallIds.has(call.id));
				allCachedCalls = allCachedCalls.concat(uniqueNewCalls);
				console.log(`Přidáno ${uniqueNewCalls.length} unikátních nových hovorů. Celkem hovorů po spojení: ${allCachedCalls.length}.`);
			} else {
				allCachedCalls = newCalls;
				console.log(`Celkem hovorů po načtení z API: ${allCachedCalls.length}.`);
			}

			allCachedCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

			saveCallsToCache(apiUser, allCachedCalls);

			if (callback) callback(null, allCachedCalls);

		} else {
			loginMessage.textContent = 'Neplatný formát dat z API. Zkontrolujte API klíč.';
			console.error("API nevrátilo pole hovorů:", data);
			if (callback) callback(new Error('Nezpracovatelná data z API.'));
		}
	});
}

// Funkce pro načtení starších dat z API
function fetchMoreCalls(apiUser, apiPass) {
	const loginMessage = document.getElementById('loginMessage');
	let earliestDate = null;

	if (allCachedCalls.length > 0) {
		earliestDate = allCachedCalls.reduce((minDate, call) => {
			const callDate = new Date(call.date);
			return callDate < minDate ? callDate : minDate;
		}, new Date());
		console.log(`Nejstarší datum v cache pro uživatele ${apiUser}: ${earliestDate.toLocaleString()}`);
	} else {
		console.log(`Cache pro uživatele ${apiUser} je prázdná, načtu data za předchozích 60 dní.`);
		earliestDate = new Date();
	}

	const toDate = new Date(earliestDate.getTime());
	toDate.setSeconds(toDate.getSeconds() - 1);
	const fromDate = new Date(toDate);
	fromDate.setDate(toDate.getDate() - 60);

	loginMessage.textContent = 'Načítám další data... ⏳';
	loginMessage.style.display = 'block';

	fetchAndCacheCalls(apiUser, apiPass, fromDate, toDate, true, (error) => {
		if (!error) {
			loginMessage.textContent = 'Další data načtena.';
			setTimeout(() => { loginMessage.style.display = 'none'; }, 3000);
			appendNextCalls();
		} else {
			loginMessage.textContent = 'Chyba při načítání dalších dat: ' + error.message;
		}
	});
}

// Logika pro obnovení dat
function refreshCallsLogic(apiUser, apiPass) {
	const loginMessage = document.getElementById('loginMessage');
	let latestDate = null;

	if (allCachedCalls.length > 0) {
		latestDate = allCachedCalls.reduce((maxDate, call) => {
			const callDate = new Date(call.date);
			return callDate > maxDate ? callDate : maxDate;
		}, new Date(0));
		console.log(`Nejnovější datum v cache pro uživatele ${apiUser}: ${latestDate.toLocaleString()}`);
	} else {
		console.log(`Cache pro uživatele ${apiUser} je prázdná, načtu data za posledních 60 dní.`);
	}

	const toDate = new Date();

	let fromDate;
	if (latestDate) {
		fromDate = new Date(latestDate.getTime());
		fromDate.setSeconds(fromDate.getSeconds() + 1);
	} else {
		fromDate = new Date();
		fromDate.setDate(toDate.getDate() - 60);
		fromDate.setHours(0, 0, 0, 0);
	}

	if (fromDate > toDate) {
		console.log(`Není co obnovovat pro uživatele ${apiUser}, FromDate (${fromDate.toLocaleString()}) je novější než ToDate (${toDate.toLocaleString()}).`);
		loginMessage.textContent = 'Všechna data jsou aktuální.';
		loginMessage.style.display = 'block';
		setTimeout(() => { loginMessage.style.display = 'none'; }, 3000);
		return;
	}

	loginMessage.textContent = 'Obnovuji data... ⏳';
	loginMessage.style.display = 'block';

	fetchAndCacheCalls(apiUser, apiPass, fromDate, toDate, true, (error) => {
		if (!error) {
			loginMessage.textContent = 'Data úspěšně obnovena.';
			setTimeout(() => { loginMessage.style.display = 'none'; }, 3000);
			displayedCalls = allCachedCalls.slice(0, ROWS_PER_PAGE);
			displayCalls(displayedCalls);
		} else {
			loginMessage.textContent = 'Chyba při obnově dat: ' + error.message;
		}
	});
}

// Inicializace po načtení DOM
document.addEventListener('DOMContentLoaded', () => {
	const apiUserField = document.getElementById('apiUser');
	const apiPassField = document.getElementById('apiPass');
	const loginButton = document.getElementById('loginButton');
	const refreshCallsButton = document.getElementById('refreshCallsButton');
	const loginMessage = document.getElementById('loginMessage');
	const loginSection = document.getElementById('loginSection');
	const callsSection = document.getElementById('callsSection');
	const tableContainer = document.getElementById('tableContainer');
	const navbar = document.querySelector('.navbar');
	const navbarTitle = document.querySelector('.navbar-title');

	loginButton.addEventListener('click', () => {
		const apiUser = apiUserField.value;
		const apiPass = apiPassField.value;

		if (!apiUser || !apiPass) {
			loginMessage.textContent = 'Prosím zadejte uživatelské jméno i heslo.';
			loginMessage.style.display = 'block';
			return;
		}

		currentApiUser = apiUser;

		// Načtení dat z cache
		allCachedCalls = loadCallsFromCache(currentApiUser);

		// Určení časového rozsahu pro API volání
		let latestDate = null;
		if (allCachedCalls.length > 0) {
			latestDate = allCachedCalls.reduce((maxDate, call) => {
				const callDate = new Date(call.date);
				return callDate > maxDate ? callDate : maxDate;
			}, new Date(0));
			console.log(`Nejnovější datum v cache: ${latestDate.toLocaleString()}`);
		}

		const toDate = new Date();
		let fromDate;
		if (latestDate) {
			fromDate = new Date(latestDate.getTime());
			fromDate.setSeconds(fromDate.getSeconds() + 1);
		} else {
			fromDate = new Date();
			fromDate.setDate(toDate.getDate() - 60);
			fromDate.setHours(0, 0, 0, 0);
		}

		fetchAndCacheCalls(apiUser, apiPass, fromDate, toDate, true, (error) => {
			if (!error) {
				displayedCalls = allCachedCalls.slice(0, ROWS_PER_PAGE);
				displayCalls(displayedCalls);
				loginSection.style.display = 'none';
				callsSection.style.display = 'block';
				navbarTitle.textContent = 'Seznam hovorů';
				refreshCallsButton.style.display = 'flex';
				loginMessage.textContent = 'Data načtena.';
				loginMessage.style.display = 'block';
				setTimeout(() => { loginMessage.style.display = 'none'; }, 3000);
			} else {
				loginMessage.textContent = 'Chyba přihlášení: Neplatné uživatelské jméno nebo heslo.';
				loginMessage.style.display = 'block';
				allCachedCalls = [];
				displayedCalls = [];
			}
		});
	});

	refreshCallsButton.addEventListener('click', () => {
		const apiUser = apiUserField.value;
		const apiPass = apiPassField.value;

		if (!apiUser || !apiPass) {
			loginMessage.textContent = 'Prosím zadejte uživatelské jméno i heslo pro obnovení dat.';
			loginMessage.style.display = 'block';
			return;
		}
		refreshCallsLogic(apiUser, apiPass);
	});

	tableContainer.addEventListener('scroll', () => {
		if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 10) {
			console.log('Dosaženo konce tabulky.');
			if (displayedCalls.length < allCachedCalls.length) {
				appendNextCalls();
			} else {
				const apiUser = apiUserField.value;
				const apiPass = apiPassField.value;
				if (!apiUser || !apiPass) {
					loginMessage.textContent = 'Prosím zadejte uživatelské jméno i heslo pro načtení dalších dat.';
					loginMessage.style.display = 'block';
					return;
				}
				fetchMoreCalls(apiUser, apiPass);
			}
		}
	});
});
