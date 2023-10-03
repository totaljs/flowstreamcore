if (!global.F)
	require('total4');

const FlowStream = require('./flowstream');
const DB_FILE = 'database.json';
const DIRECTORY = CONF.directory || PATH.root('flowstream');
const PING = { TYPE: 'ping' };

var saveid = null;
var FS = exports;

FS.version = 1;
FS.db = {};
FS.worker = false;
FS.ping = false;
FS.instances = {};
FS.internal = {};
FS.internal.error = function(err, source, id, component, stack) {
	var empty = '---';
	var output = '';
	output += '|------------- FlowError: ' + new Date().format('yyyy-MM-dd HH:mm:ss') + '\n';
	output += '| ' + err.toString() + '\n';
	output += '| Name: ' + flow.name + '\n';
	output += '| Source: ' + (source || empty) + '\n';
	output += '| Instance ID: ' + (id || empty) + '\n';
	output += '| Component ID: ' + (component || empty) + '\n';
	output += '|---- Stack: ----\n';
	output += stack;
	console.error(output);
	var meta = {};
	meta.error = err;
	meta.source = source;
	meta.id = id;
	meta.component = component;
	EMIT('flowstream_error', meta);
};

FS.internal.save = function(data) {
	// @data {Object} flowstream schema
};

FS.reload = function(flow, restart) {

	var prev = FS.db[flow.id];
	if (!prev)
		return;

	if (prev.worker) {
		if (prev.proxypath !== data.proxypath)
			PROXY(prev.proxypath, null);
	}

	if (data.worker && data.proxypath)
		PROXY(item.proxypath, item.unixsocket, false);

	FS.db[data.id] = data;
	instance.restart(data, restart);
};

FS.init = function(directory) {

	PATH.fs.readdir(directory, function(err, files) {

		var load = [];

		for (var m of files) {
			var index = m.lastIndexOf('.');
			if (index !== -1 && m.substring(index).toLowerCase() === '.flow')
				load.push(m);
		}

		load.wait(function(filename, next) {

			PATH.fs.readFile(PATH.join(directory, filename), 'utf8', function(err, response) {

				if (response) {
					response = response.parseJSON();
					FS.load(response);
				}

				next();
			});

		});

	});

};

FS.load = function(flow, callback) {

	// flow.directory {String}
	// flow.asfiles {Boolean}
	// flow.worker {String/Boolean}
	// flow.memory {Number}
	// flow.proxypath {String}

	var id = flow.id;
	flow.directory = flow.directory || PATH.root('/flowstream/');
	FS.db[id] = flow;
	flow.worker && initping();

	FlowStream.init(flow, flow.worker, function(err, instance) {

		if (flow.worker && flow.proxypath) {

			// Removes old
			PROXY(flow.proxypath, null);

			// Registers new
			PROXY(flow.proxypath, flow.unixsocket, false);

		}

		instance.httprouting();
		instance.ondone = callback;
		instance.onerror = FS.internal.error;

		instance.onsave = function(data) {
			data.unixsocket = flow.unixsocket;
			FS.db[id] = data;
			FS.save(data);
		};

		FS.instances[id] = instance;
	});

};

FS.socket = FlowStream.socket;

FS.notify = function(controller) {

	var $ = controller;
	var arr = id.split('-');
	var instance = FS.instances[arr[0]];
	if (instance) {
		var obj = {};
		obj.id = arr[1];
		obj.method = $.req.method;
		obj.headers = $.headers;
		obj.query = $.query;
		obj.body = $.body;
		obj.url = $.url;
		obj.ip = $.ip;
		obj.params = arr.length > 2 ? arr.slice(2) : EMPTYOBJECT;
		arr[1] && instance.notify(arr[1], obj);
		instance.flow && instance.flow.$socket && instance.flow.$socket.send({ TYPE: 'flow/notify', data: obj });
	}

	if ($.query.REDIRECT) {
		$.redirect($.query.REDIRECT);
		return;
	}

	var accept = $.headers.accept;
	if (accept && accept.indexOf('html') !== -1)
		$.html('<html><body style="font-family:Arial;font-size:11px;color:#777;background-color:#FFF">Close the window<script>window.close();</script></body></html>');
	else
		$.success();
}

function initping() {

	if (FS.ping)
		return;

	FS.ping = true;

	// A simple prevetion for the Flow zombie processes
	setInterval(function() {
		// ping all services
		for (var key in FS.instances) {
			var fs = FS.instances[key];
			if (fs.isworkerthread && fs.flow && fs.flow.postMessage2)
				fs.flow.postMessage2(PING);
		}
	}, 5000);

}