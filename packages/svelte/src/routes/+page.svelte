<script lang="ts">
  const libs = [
    'border-beam',
    'thinking-orbs',
    'bot-avatars',
    'liquid-gooey',
    'voice-glow',
    'voice-ring',
    'metal-fx',
    'img-fx',
    'distortion-waves',
  ];
</script>

<main>
  <h1>runeglow dev bench</h1>
  <ul>
    {#each libs as lib (lib)}
      <li><a href="/bench/{lib}">{lib}</a></li>
    {/each}
  </ul>
</main>

<style>
  main {
    padding: 40px;
  }
  a {
    color: #9cf;
  }
</style>
