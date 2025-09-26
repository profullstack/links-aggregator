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
					<a href="/latest" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
						Latest
					</a>
					<a href="/add" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
						Add Links
					</a>
				</nav>
			</div>
		</div>
	</header>
	
	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		<slot />
	</main>
	
	<footer class="bg-gray-900 text-white mt-16">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
			<!-- Main Footer Content -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
				<!-- About Section -->
				<div class="lg:col-span-2">
					<h3 class="text-2xl font-bold mb-6">Links Aggregator</h3>
					<p class="text-gray-300 text-lg mb-6 leading-relaxed">
						A privacy-focused platform for sharing and discovering links anonymously through Tor.
						Built with modern web technologies and designed for complete anonymity.
					</p>
					<div class="flex flex-wrap gap-4">
						<a href="/add" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
							Add Links
						</a>
						<a href="/" class="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-6 py-3 rounded-lg font-medium transition-colors">
							Browse Categories
						</a>
					</div>
				</div>
				
				<!-- Categories Section -->
				<div>
					<h4 class="text-lg font-semibold mb-6">Categories</h4>
					<ul class="space-y-3 text-gray-300">
						<li><a href="/category/technology" class="hover:text-white transition-colors flex items-center">
							<span class="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>Technology
						</a></li>
						<li><a href="/category/programming" class="hover:text-white transition-colors flex items-center">
							<span class="w-2 h-2 bg-green-500 rounded-full mr-3"></span>Programming
						</a></li>
						<li><a href="/category/design" class="hover:text-white transition-colors flex items-center">
							<span class="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>Design
						</a></li>
						<li><a href="/category/news" class="hover:text-white transition-colors flex items-center">
							<span class="w-2 h-2 bg-red-500 rounded-full mr-3"></span>News
						</a></li>
						<li><a href="/category/education" class="hover:text-white transition-colors flex items-center">
							<span class="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>Education
						</a></li>
						<li><a href="/category/entertainment" class="hover:text-white transition-colors flex items-center">
							<span class="w-2 h-2 bg-pink-500 rounded-full mr-3"></span>Entertainment
						</a></li>
					</ul>
				</div>
				
				<!-- Privacy & Features Section -->
				<div>
					<h4 class="text-lg font-semibold mb-6">Privacy Features</h4>
					<ul class="space-y-3 text-gray-300">
						<li class="flex items-center">
							<span class="text-purple-400 mr-3">🧅</span>
							<span>Tor Hidden Service</span>
						</li>
						<li class="flex items-center">
							<span class="text-green-400 mr-3">🔒</span>
							<span>Anonymous Browsing</span>
						</li>
						<li class="flex items-center">
							<span class="text-red-400 mr-3">🚫</span>
							<span>No Tracking</span>
						</li>
						<li class="flex items-center">
							<span class="text-blue-400 mr-3">🌐</span>
							<span>Decentralized</span>
						</li>
						<li class="flex items-center">
							<span class="text-yellow-400 mr-3">⚡</span>
							<span>Fast & Lightweight</span>
						</li>
						<li class="flex items-center">
							<span class="text-indigo-400 mr-3">🔄</span>
							<span>Real-time Updates</span>
						</li>
					</ul>
				</div>
			</div>
			
			<!-- Tech Stack Section -->
			<div class="border-t border-gray-700 pt-12 mb-12">
				<h4 class="text-lg font-semibold mb-6 text-center">Built With Modern Technology</h4>
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 text-center">
					<div class="text-gray-400">
						<div class="text-2xl mb-2">⚡</div>
						<div class="text-sm">SvelteKit 5</div>
					</div>
					<div class="text-gray-400">
						<div class="text-2xl mb-2">🗄️</div>
						<div class="text-sm">Supabase</div>
					</div>
					<div class="text-gray-400">
						<div class="text-2xl mb-2">🎨</div>
						<div class="text-sm">Tailwind CSS</div>
					</div>
					<div class="text-gray-400">
						<div class="text-2xl mb-2">🐳</div>
						<div class="text-sm">Docker</div>
					</div>
					<div class="text-gray-400">
						<div class="text-2xl mb-2">🚂</div>
						<div class="text-sm">Railway</div>
					</div>
					<div class="text-gray-400">
						<div class="text-2xl mb-2">🧅</div>
						<div class="text-sm">Tor Network</div>
					</div>
				</div>
			</div>
			
			<!-- Bottom Section -->
			<div class="border-t border-gray-700 pt-8 text-center">
				<div class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
					<div class="text-gray-400">
						<p>&copy; 2025 Links Aggregator. Privacy-first link sharing.</p>
					</div>
					<div class="flex space-x-6 text-sm text-gray-400">
						<span>No cookies</span>
						<span>•</span>
						<span>No tracking</span>
						<span>•</span>
						<span>Open source</span>
					</div>
				</div>
				
				<div class="mt-6 text-xs text-gray-500">
					<p>This site is accessible via Tor for enhanced privacy and anonymity.</p>
				</div>
			</div>
		</div>
	</footer>
</div>