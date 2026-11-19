<script lang="ts">
  import { BorderBeam } from '../../../lib/border-beam/index.js';
  import type { BorderBeamSize } from '../../../lib/border-beam/index.js';

  const sizes: BorderBeamSize[] = ['md', 'sm', 'line', 'pulse-inner', 'pulse-outside'];
  let active = $state(true);
</script>

<main>
  <p><a href="/">← bench</a></p>
  <button onclick={() => (active = !active)}>{active ? 'Pause' : 'Play'}</button>
  <section>
    <h2>border-beam</h2>
    <div class="row">
      {#each sizes as size (size)}
        <BorderBeam {size} {active}>
          <div class="card">{size}</div>
        </BorderBeam>
      {/each}
    </div>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #121212;
    color: #eee;
    font-family: system-ui, sans-serif;
  }
  main {
    padding: 40px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 56px;
    padding: 40px 0;
  }
  .card {
    width: 220px;
    height: 120px;
    border-radius: 16px;
    background: #1d1d1d;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: grid;
    place-items: center;
  }
</style>
