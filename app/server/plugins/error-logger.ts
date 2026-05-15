export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error, { event }) => {
    console.error(`Prerender error at ${event?.path}:`, error)
  })
})