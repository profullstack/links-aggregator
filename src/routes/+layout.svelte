<script>
	import '../app.css';
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<a href="/" class="text-xl font-bold text-gray-900 uppercase hover:text-blue-600 transition-colors">
						Links Aggregator
					</a>
				</div>
				<nav class="flex items-center space-x-4">
					<a href="/" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
						Home
					</a>
					<a href="/add" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
						Add Links
					</a>
				</nav>
			</div>
		</div>
	</header>
	
	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 min-h-screen">
		<slot />
	</main>
	
	<footer class="bg-gray-800 text-white">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div>
					<h3 class="text-lg font-semibold mb-4">Links Aggregator</h3>
					<p class="text-gray-300 text-sm">
						A privacy-focused platform for sharing and discovering links anonymously through Tor.
					</p>
				</div>
				
				<div>
					<h4 class="text-md font-semibold mb-4">Categories</h4>
					<ul class="space-y-2 text-sm text-gray-300">
						<li><a href="/category/technology" class="hover:text-white">Technology</a></li>
						<li><a href="/category/programming" class="hover:text-white">Programming</a></li>
						<li><a href="/category/design" class="hover:text-white">Design</a></li>
						<li><a href="/category/news" class="hover:text-white">News</a></li>
						<li><a href="/category/education" class="hover:text-white">Education</a></li>
						<li><a href="/category/entertainment" class="hover:text-white">Entertainment</a></li>
					</ul>
				</div>
				
				<div>
					<h4 class="text-md font-semibold mb-4">Privacy</h4>
					<ul class="space-y-2 text-sm text-gray-300">
						<li>🧅 Tor Hidden Service</li>
						<li>🔒 Anonymous Browsing</li>
						<li>🚫 No Tracking</li>
						<li>🌐 Decentralized</li>
					</ul>
				</div>
			</div>
			
			<div class="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
				<p>&copy; 2025 Links Aggregator. Privacy-first link sharing.</p>
			</div>
		</div>
	</footer>
</div>