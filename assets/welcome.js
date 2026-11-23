(() => {
  document.getElementById('dismiss-pin-tip')?.addEventListener('click', () => { document.querySelector('.pin-tip').hidden = true; });
  const field = document.querySelector('.confetti-field');
  const colors = ['#00aeec','#f38bb4','#f6c344','#66cbb7','#a79ce0'];
  for(let i=0;i<34;i++) {
    const piece=document.createElement('i');piece.className='confetti';
    piece.style.cssText=`--x:${(i*29+7)%100}%;--y:${(i*37+9)%100}%;--color:${colors[i%5]};--r:${i*43}deg;--delay:${i%6*.045}s`;
    field.append(piece);
  }
  document.querySelector('[data-confetti-replay]')?.addEventListener('click', () => {
    field.querySelectorAll('.confetti').forEach(piece => {
      piece.style.animation = 'none';
      void piece.offsetWidth;
      piece.style.animation = '';
    });
  });
})();
