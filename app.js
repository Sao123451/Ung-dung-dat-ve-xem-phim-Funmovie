// helpers
const $ = (s, r = document) => r.querySelector(s);

// render login by default
(function start() {
  const tpl = $('#tpl-login');
  if (!tpl) return console.error('Không tìm thấy template login');
  const frag = tpl.content.cloneNode(true);
  const root = $('#root');
  root.innerHTML = '';
  root.append(frag);

  // demo button
  $('#btn-fill-demo').onclick = () => {
    $('#lg-username').value = 'admin@example.com';
    $('#lg-password').value = 'admin123';
  };
})();
