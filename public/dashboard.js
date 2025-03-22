// dashboard.js

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    const userId = user.uid;

    firebase.firestore().collection('users').doc(userId).get()
      .then((doc) => {
        if (doc.exists) {
          const credits = doc.data().credits || 0;
          document.body.insertAdjacentHTML(
            'beforeend',
            `<p>🎧 You have <strong>${credits}</strong> credits.</p>`
          );
        } else {
          document.body.insertAdjacentHTML(
            'beforeend',
            '<p>No credit data found.</p>'
          );
        }
      })
      .catch((error) => {
        console.error('Error fetching credits:', error);
        document.body.insertAdjacentHTML(
          'beforeend',
          '<p>Error loading credits.</p>'
        );
      });
  } else {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<p>Please log in to view your dashboard.</p>'
    );
  }
});

