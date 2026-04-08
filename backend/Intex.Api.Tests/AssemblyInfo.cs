using Xunit;

// Shared HttpClient + cookie session state must not run in parallel across tests.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
